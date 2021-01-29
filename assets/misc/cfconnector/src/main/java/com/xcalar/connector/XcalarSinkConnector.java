package com.xcalar.connector;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.kafka.common.config.ConfigDef;
import org.apache.kafka.connect.connector.Task;
import org.apache.kafka.connect.sink.SinkConnector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class XcalarSinkConnector extends SinkConnector {
  private static Logger log = LoggerFactory.getLogger("XcalarSinkConnector");
  private Map<String, String> props;
  private XcalarSinkConnectorConfig config;

  @Override
  public String version() {
    return VersionUtil.getVersion();
  }

  @Override
  public void start(Map<String, String> props) {
    this.props = props;
    this.config = new XcalarSinkConnectorConfig(props);
  }

  @Override
  public Class<? extends Task> taskClass() {
    return XcalarSinkTask.class;
  }

  @Override
  public List<Map<String, String>> taskConfigs(int maxTasks) {
    int numTasks = Math.min(maxTasks, this.config.getXcalarConnection().size());

    List<Map<String, String>> taskConfigs = new ArrayList<>();
    for (int i = 0; i < numTasks; i++) {
      Map<String, String> taskConfig = new HashMap<>(this.props);
      taskConfig.put(XcalarSinkConnectorConfig.TASK_ID_TCONFIG, String.valueOf(i));
      taskConfigs.add(taskConfig);
    }
    return taskConfigs;
  }

  @Override
  public void stop() {
    // TODO: Do things that are necessary to stop your connector.
  }

  @Override
  public ConfigDef config() {
    return XcalarSinkConnectorConfig.conf();
  }
}
