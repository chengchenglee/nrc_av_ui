#!/usr/bin python

import time
import os
import ssl
import json
import argparse
import paho.mqtt.client as mqtt_client
from collections import OrderedDict
from sys import getsizeof

import rospy
from nrc_msgs.msg import GpsState

subscribeTopics = ["dt/tfc/vehicle/telemetry"]

class CloudConnection:
  def __init__(self,clientId):
    self.name = clientId
    self.clientId = self.name+time.strftime("%Y-%m-%d-%H-%M-%S")
    self.isConnected = False
    print ("Create mqtt connection:",self.clientId) 

    # MQTT Broker details
    self.configInfo = {
      'MQTT_SERVER': 'mqtt-broker-ncal.nrcsv.com',
      'MQTT_PORT': 8883,
      'MQTT_USER': 'sam-teleop',
      'MQTT_PASSWORD': 'yg#eo5cbAksD82qt',
      'PROTOCOL': ssl.PROTOCOL_TLSv1_2,
    }
    self.client = []
    self.mailbox = []
    
  def updateConfig(self,text):
    keys = self.configInfo.keys()
    lines = text.split('\n')
    for line in lines:
      for key in keys:
        if key in line:
          value = line.split(': ')[1]
          self.configInfo[key] = value
    
  def init(self):
    self.client = self.connect_mqtt()
    self.client.loop_start()
    
  def getMail(self):
    mail = self.mailbox[:]
    self.mailbox = []
    return mail

  def connect_mqtt(self):
      def on_connect(client, userdata, flags, rc):
          if rc == 0:
              self.isConnected = True
              print("Connected to MQTT Broker!")
          else:
              print("Failed to connect, return code %d\n", rc)
      
      def on_disconnect(client, userdata, rc):
        self.isConnected = False
        print('MQTT disconnected:'+str(rc))
      
      def on_mqtt_message(client, userdata, message):
        # Get message topic
        msg = {}
        msg['topic'] = message.topic
        
        # Parse csv data
        payloadCsv = message.payload
        #if type(payloadCsv) == 'bytes':
        payloadCsv = message.payload.decode('utf-8')
        
        data = []
        lines = payloadCsv.split('\n')
        for line in lines:
          lineData = line.split(',')
          data.append(list(lineData))
        
        msg['data'] = data
        self.mailbox.append(msg)

      def on_mqtt_subscribe(client, userdata, mid, granted_qos):  # subscribe to mqtt broker
          a = 1
          #print("Subscribed to mqtt messages.")
      
      client_id = 'natcsv-mqtt-client.'+self.clientId
      client = mqtt_client.Client(client_id)
      client.username_pw_set(self.configInfo['MQTT_USER'], self.configInfo['MQTT_PASSWORD'])
      
      if self.configInfo['MQTT_PORT'] == 8883:
          # enable SSL
          context = ssl.SSLContext(self.configInfo['PROTOCOL'])
          # do not check the cert hostname
          context.check_hostname = False
          client.tls_set_context(context)

      client.on_connect = on_connect
      client.connect(self.configInfo['MQTT_SERVER'], self.configInfo['MQTT_PORT'])
      client.on_subscribe = on_mqtt_subscribe
      client.on_message = on_mqtt_message
      return client

  def subscribe(self,topics):
    for topic in topics:
      print('Mqtt subscribe to topic:',topic)
      self.client.subscribe(topic,2)
      
  def unsubscribe(self,topics):
    for topic in topics:
      print('Mqtt unsubscribe to topic:',topic)
      self.client.unsubscribe(topic)

  def publishCsv(self,topic,data):
    if len(data) > 0:
      tStart = time.time()
      result = self.client.publish(topic, data,qos=2)
      result.wait_for_publish()
      status = result[0]
      if status != 0:
        print("Failed to send msg to broker.")
      else:
        dt = time.time()-tStart
        dtms = round(dt*10000)/10
        rate = getsizeof(data)/(dt*1000)
        print('Message sent (ms/kbps):'+str(dtms)+','+str(round(rate)))
    
  #def publish(self,topic,data):
    #if len(data) > 0:
      #msg = json.dumps(data)
      #result = self.client.publish(topic, msg)
      #status = result[0]
      #if status != 0:
          #print("Failed to send msg to broker.")
