#!/usr/bin python

import os
import ssl
import json
import argparse
import paho.mqtt.client as mqtt_client
from collections import OrderedDict

import rospy
from nrc_msgs.msg import GpsState

subscribeTopics = ["dt/tfc/vehicle/telemetry"]

class CloudConnection:
  def __init__(self,agent_name,clientId):
    self.name = agent_name
    self.clientId = clientId
    self.g_device_id = '' # need to be passed as argument

    # MQTT Broker details
    self.BROKER_ADDRESS = os.getenv('MQTT_SERVER', 'mqtt-broker-ncal.nrcsv.com')
    self.BROKER_PORT = int(os.getenv('MQTT_PORT', 8883))
    self.BROKER_USERNAME = os.getenv('MQTT_USER', 'sam-teleop')
    self.BROKER_PASSWORD = os.getenv('MQTT_PASSWORD', 'yg#eo5cbAksD82qt')
    self.TLS_protocol_version = ssl.PROTOCOL_TLSv1_2
    self.PUB_TOPIC_STATUS = "dt/tfc/vehicle/telemetry"
    self.PUB_RATE = 5 # Hz
    self.client = []
    
    self.mailbox = []
    
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
              print("Connected to MQTT Broker!")
          else:
              print("Failed to connect, return code %d\n", rc)
      
      def on_mqtt_message(client, userdata, message):
        self.mailbox.append(message)

      def on_mqtt_subscribe(client, userdata, mid, granted_qos):  # subscribe to mqtt broker
          print("Subscribed to mqtt messages.")
      
      client_id = 'natcsv-mqtt-client.'+self.clientId
      client = mqtt_client.Client(client_id)
      client.username_pw_set(self.BROKER_USERNAME, self.BROKER_PASSWORD)
      
      if self.BROKER_PORT == 8883:
          # enable SSL
          context = ssl.SSLContext(self.TLS_protocol_version)
          # do not check the cert hostname
          context.check_hostname = False
          client.tls_set_context(context)

      client.on_connect = on_connect
      client.connect(self.BROKER_ADDRESS, self.BROKER_PORT)
      client.on_subscribe = on_mqtt_subscribe
      client.on_message = on_mqtt_message
      return client

  def subscribe(self,topics):
    for topic in topics:
      self.client.subscribe(topic,2)

  def publish(self,topic,data):
    if len(data) > 0:
      msg = json.dumps(data,encoding="utf8", ensure_ascii=False)
      result = self.client.publish(topic, msg)
      status = result[0]
      if status != 0:
          print("Failed to send msg to broker.")
