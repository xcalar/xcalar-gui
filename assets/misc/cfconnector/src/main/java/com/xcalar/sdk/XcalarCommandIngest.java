package com.xcalar.sdk;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.gson.Gson;

public class XcalarCommandIngest implements IXcalarCommand {
  private static final String FIELD_VERSION = "ver";
  private static final String FIELD_TYPE = "type";
  private static final String FIELD_DATA = "data";

  private static final String TYPE = "INGEST";
  private static final String VERSION = "1";

  private Gson json;
  private List<Object> data;

  public XcalarCommandIngest(List<Object> records) {
    this.json = new Gson();
    this.data = new ArrayList<Object>(records);
  }

  public byte[] getBytes() {
    byte[] data = this.getJsonString().getBytes(StandardCharsets.UTF_8);
    int dataLen = data.length;
    return ByteBuffer.allocate(4 + dataLen)
        .order(ByteOrder.BIG_ENDIAN).putInt(data.length).put(data).array();
  }

  private String getJsonString() {
    Map<String, Object> commMap = new HashMap<String, Object>();
    commMap.put(FIELD_VERSION, VERSION);
    commMap.put(FIELD_TYPE, TYPE);
    commMap.put(FIELD_DATA, data);
    return json.toJson(commMap);
  }

  @Override
  public String toString() {
    return this.getJsonString();
  }
}
