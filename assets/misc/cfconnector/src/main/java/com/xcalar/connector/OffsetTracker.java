package com.xcalar.connector;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;

import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;

class OffsetTracker {
  private Map<TopicPartition, OffsetAndMetadata> offsets;
  private int changeId;

  public OffsetTracker() {
    offsets = new HashMap<>();
    this.changeId = 0;
  }

  public void clearOffsets() {
    offsets.clear();
    this.changeId = 0;
  }

  public void resetOffsets(Collection<TopicPartition> partitions) {
    offsets.clear();
    for (TopicPartition partition : partitions) {
      offsets.put(partition, new OffsetAndMetadata(0));
    }
  }

  public void logOffsets(Map<TopicPartition, OffsetAndMetadata> latestOffsets) {
    for (Map.Entry<TopicPartition, OffsetAndMetadata> entry : latestOffsets.entrySet()) {
      offsets.put(entry.getKey(), entry.getValue());
    }
    this.changeId++;
  }

  public void logOffset(TopicPartition topicPartition, OffsetAndMetadata offset) {
    offsets.put(topicPartition, offset);
    this.changeId++;
  }

  public int getChangeId() {
    return this.changeId;
  }

  public Map<TopicPartition, OffsetAndMetadata> getOffsets() {
    Map<TopicPartition, OffsetAndMetadata> result = new HashMap<>();
    for (Map.Entry<TopicPartition, OffsetAndMetadata> entry : offsets.entrySet()) {
      result.put(entry.getKey(), entry.getValue());
    }
    return result;
  }
}