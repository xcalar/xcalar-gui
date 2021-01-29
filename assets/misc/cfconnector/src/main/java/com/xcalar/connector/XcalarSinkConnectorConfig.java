package com.xcalar.connector;

import java.util.List;
import java.util.Map;

import org.apache.kafka.common.config.AbstractConfig;
import org.apache.kafka.common.config.ConfigDef;
import org.apache.kafka.common.config.ConfigDef.Importance;
import org.apache.kafka.common.config.ConfigDef.Type;

public class XcalarSinkConnectorConfig extends AbstractConfig {
  // Connector level configuration
  public static final String XCALAR_CONNECTION_CONFIG = "xcalar.connection";
  private static final String XCALAR_CONNECTION_DOC = "Xcalar connection list";
  public static final String XCALAR_BATCHSIZE_CONFIG = "xcalar.batchsize";
  private static final String XCALAR_BATCHSIZE_DOC = "Batch size";
  public static final String XCALAR_NUMROWS_CONFIG = "xcalar.numrows";
  private static final String XCALAR_NUMROWS_DOC = "Number of rows for each connection";

  // Task level configuration
  public static final String TASK_ID_TCONFIG = "task.id";

  public XcalarSinkConnectorConfig(ConfigDef config, Map<String, String> parsedConfig) {
    super(config, parsedConfig);
  }

  public XcalarSinkConnectorConfig(Map<String, String> parsedConfig) {
    this(conf(), parsedConfig);
  }

  public static ConfigDef conf() {
    return new ConfigDef()
        .define(XCALAR_BATCHSIZE_CONFIG, Type.INT, 10, Importance.HIGH, XCALAR_BATCHSIZE_DOC)
        .define(XCALAR_CONNECTION_CONFIG, Type.LIST, Importance.HIGH, XCALAR_CONNECTION_DOC)
        .define(XCALAR_NUMROWS_CONFIG, Type.LIST, Importance.HIGH, XCALAR_NUMROWS_DOC);
  }

  public List<String> getXcalarConnection() {
    return this.getList(XCALAR_CONNECTION_CONFIG);
  }

  public List<String> getXcalarNumrows() {
    return this.getList(XCALAR_NUMROWS_CONFIG);
  }

  public int getXcalarBatchSize() {
    return this.getInt(XCALAR_BATCHSIZE_CONFIG);
  }
}

// keyConverter: org.apache.kafka.connect.storage.StringConverter
// valueConverter: org.apache.kafka.connect.json.JsonConverter
// value.converter.schemas.enable = false
