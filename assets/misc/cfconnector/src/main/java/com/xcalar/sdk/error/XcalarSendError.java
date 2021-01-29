package com.xcalar.sdk.error;

public class XcalarSendError extends Exception {
  public XcalarSendError(Exception error) {
    super(error);
  }
}