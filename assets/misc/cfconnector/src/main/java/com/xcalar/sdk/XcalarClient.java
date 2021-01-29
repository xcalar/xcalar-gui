package com.xcalar.sdk;

import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.xcalar.sdk.error.XcalarInvalidConnectStringError;
import com.xcalar.sdk.error.XcalarOpenError;
import com.xcalar.sdk.error.XcalarSendError;

public class XcalarClient {
  private static final Logger log = LoggerFactory.getLogger(XcalarClient.class);
  private static final int CONNECTION_TIMEOUT = 2000; // 2 seconds
  private static final int SOCKET_TIMEOUT = 2000; // 2 seconds

  private InetSocketAddress serverEndpoint;
  private Socket socket = null;
  private DataOutputStream outStream = null;
  private DataInputStream inStream = null;

  public XcalarClient() {
  }

  public void open(String connectString) throws XcalarInvalidConnectStringError, XcalarOpenError {
    // Parse connection string
    try {
      // connectString = "<host>:<port>"
      String[] connectList = connectString.split(":");
      if (connectList.length != 2) {
        throw new XcalarInvalidConnectStringError("Invalid connection format");
      }
      String host = connectList[0];
      int port = Integer.parseInt(connectList[1]);
      this.serverEndpoint = new InetSocketAddress(host, port);
    } catch (NumberFormatException e) {
      throw new XcalarInvalidConnectStringError("Invalid port number");
    }

    // Establish socket connection
    this.open();
  }

  protected void open() throws XcalarOpenError {
    try {
      this.close();
      this.openSocket();
      this.openIOStreams();
    } catch (Exception e) {
      this.close();
      throw new XcalarOpenError(e);
    }
  }

  public void close() {
    this.closeIOStreams();
    this.closeSocket();
  }

  public XcalarResponse send(IXcalarCommand command) throws XcalarSendError {
    try {
      // Send data
      byte[] sendBuf = command.getBytes();
      this.outStream.write(sendBuf);
      this.outStream.flush();
      log.debug("Send: {}", command);

      // Read response
      int respLen = inStream.readInt(); // Length of the data
      byte[] dataBuf = new byte[respLen];
      inStream.readFully(dataBuf); // Read data

      // Parse response
      XcalarResponse response = new XcalarResponse(dataBuf);
      log.debug("Receive: {},{}", respLen, response);

      return response;
    } catch (SocketTimeoutException e) {
      log.warn("No response/timeout: {}", command);
      // No response returned before timeout
      // It could be a network issue, or service doesn't return anything
      return null;
    } catch (Exception e) {
      throw new XcalarSendError(e);
    }
  }

  protected void openSocket() throws IOException {
    this.socket = new Socket();
    this.socket.connect(this.serverEndpoint, CONNECTION_TIMEOUT);
    this.socket.setSoTimeout(SOCKET_TIMEOUT);
  }

  protected void openIOStreams() throws IOException {
    this.outStream = new DataOutputStream(this.socket.getOutputStream());
    this.inStream = new DataInputStream(this.socket.getInputStream());
  }

  protected void closeSocket() {
    try {
      if (this.socket != null) {
        this.socket.close();
      }
    } catch (Exception e) {
      log.warn(e.getMessage());
    } finally {
      this.socket = null;
    }
  }

  protected void closeIOStreams() {
    try {
      if (this.inStream != null) {
        this.inStream.close();
      }
    } catch (Exception e) {
      log.warn(e.getMessage());
    } finally {
      this.inStream = null;
    }

    try {
      if (this.outStream != null) {
        this.outStream.close();
      }
    } catch (Exception e) {
      log.warn(e.getMessage());
    } finally {
      this.outStream = null;
    }
  }
}
