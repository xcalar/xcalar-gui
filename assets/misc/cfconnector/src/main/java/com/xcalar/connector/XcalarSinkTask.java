package com.xcalar.connector;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.connect.sink.SinkRecord;
import org.apache.kafka.connect.sink.SinkTask;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.xcalar.sdk.IXcalarCommand;
import com.xcalar.sdk.XcalarClient;
import com.xcalar.sdk.XcalarCommandIngest;
import com.xcalar.sdk.XcalarResponse;

public class XcalarSinkTask extends SinkTask {
  private static Logger log = LoggerFactory.getLogger("XcalarSinkTask");
  private static int MAX_NO_DATA = 1;

  private XcalarSinkConnectorConfig config;
  private int id;
  private OffsetTracker offsets;
  private int noDataCount;
  private XcalarClient xcalar;
  private int numRowsToProcess;

  public XcalarSinkTask() {
    this.xcalar = new XcalarClient();
    this.offsets = new OffsetTracker();
    this.noDataCount = 0;
    this.numRowsToProcess = Integer.MAX_VALUE;
  }

  @Override
  public String version() {
    return VersionUtil.getVersion();
  }

  @Override
  public void start(Map<String, String> props) {
    try {
      Map<String, String> connectorProps = new HashMap<>(props);

      // Task specific configurations
      this.id = Integer.valueOf(
          connectorProps.getOrDefault(XcalarSinkConnectorConfig.TASK_ID_TCONFIG, "0"));

      // Connector configurations
      this.config = new XcalarSinkConnectorConfig(connectorProps);
      log.info("start({})", this.id);

      List<String> cfgNumRows = config.getXcalarNumrows();
      if (cfgNumRows.size() > this.id) {
        this.numRowsToProcess = Integer.valueOf(cfgNumRows.get(this.id));
      } else {
        this.numRowsToProcess = Integer.MAX_VALUE;
      }
      if (this.numRowsToProcess < 0) {
        this.numRowsToProcess = Integer.MAX_VALUE;
      }
      log.info("numRows({}): {}", this.id, this.numRowsToProcess);

      // Connect to xcalar
      this.xcalar.open(config.getXcalarConnection().get(this.id));
    } catch (Exception e) {
      log.error(e.getMessage());
      throw new Error(e);
    }
  }

  @Override
  public void put(Collection<SinkRecord> collection) {
    // Stop when there is no more data
    if (collection.size() == 0) {
      this.noDataCount++;
    } else {
      this.noDataCount = 0;
    }
    if (this.noDataCount >= this.MAX_NO_DATA) {
      log.info("put({}): no data exit", this.id);
      this.xcalar.close();
      throw new Error("no data");
    }
    // Stop when exceeds number of row limit
    if (this.numRowsToProcess <= 0) {
      log.info("put({}): reach row limit", this.id);
      this.xcalar.close();
      throw new Error("reach row limit");
    }

    // Send data batch by batch
    final Iterator<SinkRecord> it = collection.iterator();
    final int batchSize = config.getXcalarBatchSize();
    final List<SinkRecord> cache = new ArrayList<>();

    while (it.hasNext() && this.numRowsToProcess > 0) {
      final SinkRecord sinkRecord = it.next();
      cache.add(sinkRecord);
      this.numRowsToProcess--;

      if (cache.size() >= batchSize) {
        sendAndLog(cache);
        cache.clear();
      }
    }

    if (cache.size() > 0) {
      sendAndLog(cache);
      cache.clear();
    }
  }

  protected void sendAndLog(Collection<SinkRecord> sinkRecords) {
    // TODO: handle retry case. Now we are skipping any errors
    try {
      final Map<TopicPartition, OffsetAndMetadata> offsetsToCommit = new HashMap<>();

      // Send records to xcalar api
      final List<Object> xcalarRecords = new ArrayList<>();
      for (SinkRecord record : sinkRecords) {
        xcalarRecords.add(record.value());
        offsetsToCommit.put(new TopicPartition(record.topic(), record.kafkaPartition()),
            new OffsetAndMetadata(record.kafkaOffset()));
      }

      // Store data
      IXcalarCommand command = new XcalarCommandIngest(xcalarRecords);
      XcalarResponse response = this.xcalar.send(command);
      if (response.getStatus() == 0) {
        // Commit
        offsets.logOffsets(offsetsToCommit);
        log.info("SendAndLog({}): {}", this.id, sinkRecords.size());
      } else {
        log.warn("Send failed({}): status = {}", this.id, response.getStatus());
      }

    } catch (Exception e) {
      log.warn("Send failed({}): {}", id, e.getStackTrace());
    }
  }

  @Override
  public Map<TopicPartition, OffsetAndMetadata> preCommit(
      Map<TopicPartition, OffsetAndMetadata> currentOffsets) {
    return this.offsets.getOffsets();
  }

  @Override
  public void stop() {
    this.xcalar.close();
    log.info("stop({})", id);
  }

  @Override
  public void open(Collection<TopicPartition> partitions) {
    // Debug only
    Collection<String> topics = new HashSet<String>();
    for (TopicPartition topicPartition : partitions) {
      topics.add(topicPartition.topic());
    }
    log.info("onPartitionAssign({}): num = ({})", id, partitions.size());
    log.info("onPartitionAssign({}): topics = ({})", id, topics);

    // Stop the task if there is no partition assigned
    if (partitions.size() <= 0) {
      throw new Error("No partition assigned");
    }

    // onPartitionAssign
    this.offsets.clearOffsets();
    this.noDataCount = 0;

    super.open(partitions);
  }

  @Override
  public void close(Collection<TopicPartition> partitions) {
    // onPartitionRevoke
    log.info("onPartitionRevoke({}): num = ({})", id, partitions.size());
    super.close(partitions);
  }
}
