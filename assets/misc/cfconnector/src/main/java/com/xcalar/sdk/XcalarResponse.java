package com.xcalar.sdk;

import java.nio.charset.StandardCharsets;

import com.google.gson.Gson;

public class XcalarResponse {
  private static final String FIELD_VERSION = "ver";
  private static final String VERSION = "1";

  private Gson json;
  private Response response;

  public XcalarResponse(byte[] respBuf) {
    this.json = new Gson();
    String str = new String(respBuf, StandardCharsets.UTF_8);
    this.response = this.json.fromJson(str, Response.class);
  }

  @Override
  public String toString() {
    return this.json.toJson(this.response, Response.class);
  }

  public String getVersion() {
    return this.response.ver;
  }
  
  public int getStatus() {
    return this.response.status;
  }

  private static class Response {
    public String ver = "";
    public int status = 0;
  }
}
