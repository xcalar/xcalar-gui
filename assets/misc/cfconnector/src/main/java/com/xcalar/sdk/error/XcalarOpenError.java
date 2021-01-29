package com.xcalar.sdk.error;

public class XcalarOpenError extends Exception {
  public XcalarOpenError(Exception error) {
    super(error);
  }
}