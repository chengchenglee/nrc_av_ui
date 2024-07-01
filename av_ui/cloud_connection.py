#!/usr/bin python

import time
import os
import ssl
import json
import argparse
import paho.mqtt.client as mqtt_client
from collections import OrderedDict
from sys import getsizeof
import yaml
import rospy
from nrc_msgs.msg import GpsState
import rospkg
from threading import Lock

mutex = Lock()
usingMailbox = False

subscribeTopics = ["dt/tfc/vehicle/telemetry"]
mqtt_filename = 'mqtt_connection_config.yaml'

#MQTT parameters from environment variables
#BROKER_ADDRESS = os.getenv('MQTT_SERVER', 'mqtt-broker-ncal.nrcsv.com')
#BROKER_PORT = int(os.getenv('MQTT_PORT', 8883))
#BROKER_USERNAME = os.getenv('MQTT_USER', 'sam_teleop')
#BROKER_PASSWORD = os.getenv('MQTT_PASSWORD', 'yg#eo5cbAksD82qt')
TLS_protocol_version = ssl.PROTOCOL_TLSv1_2

class CloudConnection:
  def __init__(self,clientId, brokerName):
    self.name = clientId
    self.broker = brokerName
    self.clientId = self.name+time.strftime("%Y-%m-%d-%H-%M-%S")
    self.filename = self.filename = rospkg.RosPack().get_path('nrc_av_ui')+'/config/'+mqtt_filename
    self.isConnected = False
    self.msgsSinceLastUpdate = 0
    self.avgTransferRate = 3
    self.lastUpdateTime = time.time()
    print ("Create mqtt connection:",self.clientId) 
    self.configInfo = self.loadBrokerConfigs()
    print(self.configInfo)
    self.configInfo['PROTOCOL'] = TLS_protocol_version
    if not self.configInfo:
      print("Check mqtt config file.")
    self.client = []
    self.mailbox = []
    self.subscriptions = []
    self.unsubscriptions = []
    self.dataInQueue = False

  def loadBrokerConfigs(self):
    config_file = open(self.filename, 'r')
    configs = yaml.safe_load(config_file)
    if self.broker in configs['Brokers'].keys():
      mqtt_configs = configs['Brokers'][self.broker]
      return mqtt_configs
    else:
      print("Check mqtt configuration file. Available brokers: ", configs['Brokers'].keys())
      return None
    
  def updateConfig(self,text):
    keys = self.configInfo.keys()
    lines = text.split('\n')
    for line in lines:
      for key in keys:
        if key in line:
          value = line.split(': ')[1]
          self.configInfo[key] = value
    
  def init(self, configName='doris'):
    self.client = self.connect_mqtt(configName)
    self.client.loop_start()
    
  def getMail(self):
    with mutex:
      usingMailbox = True
      mail = self.mailbox[:]
      self.mailbox = []
      usingMailbox = False
    return mail

  def connect_mqtt(self,configName):
      def on_connect(client, userdata, flags, rc):
          if rc == 0:
              self.isConnected = True
              print("Connected to MQTT Broker!")
              
              resubscribeTopics = []
              for t in self.subscriptions:
                if t[1] == True:
                  client.subscribe(t[0],2)
                  resubscribeTopics.append(t[0])
              if len(resubscribeTopics) > 0:
                print('Resubscribe:',resubscribeTopics)
          else:
              print("Failed to connect, return code %d\n", rc)
      
      def on_disconnect(client, userdata, rc):
        self.isConnected = False
        print('MQTT disconnected:'+str(rc))
        try:
          print('Attempt reconnect')
          client.connect(self.configInfo['MQTT_SERVER'], self.configInfo['MQTT_PORT'])
        except:
          print('Failed to reconnect')
      
      def on_mqtt_message(client, userdata, message):
        # Get message topic
        msg = {}
        msg['topic'] = message.topic
        
        if ('snp' in message.topic) and ('data' in message.topic):
          msg['data'] = message.payload
          
        else:
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
        
        with mutex:
          #if usingMailbox == True:
            #print('Possible mutex issue!')
          self.mailbox.append(msg)
        
      def on_publish(client, userdata, mid):
        self.dataInQueue = False

      def on_mqtt_subscribe(client, userdata, mid, granted_qos):  # subscribe to mqtt broker
          a = 1
          #print("Subscribed to mqtt messages.")
      
      client_id = 'natcsv-mqtt-client.'+self.clientId
      client = mqtt_client.Client(client_id, clean_session=False)
      client.username_pw_set(self.configInfo['MQTT_USER'], self.configInfo['MQTT_PASSWORD'])
      
      if self.configInfo['MQTT_PORT'] == 8883:
          # enable SSL
          context = ssl.SSLContext(self.configInfo['PROTOCOL'])
          # do not check the cert hostname
          context.check_hostname = False
          client.tls_set_context(context)

      client.on_connect = on_connect
      client.on_disconnect = on_disconnect
      print(self.configInfo['MQTT_SERVER'], self.configInfo['MQTT_PORT'])
      client.connect(self.configInfo['MQTT_SERVER'], self.configInfo['MQTT_PORT'])
      client.on_subscribe = on_mqtt_subscribe
      client.on_message = on_mqtt_message
      client.on_publish = on_publish
      return client

  def subscribe(self,topics):
    for topic in topics:
      print('Mqtt subscribe to topic:',topic)
      self.client.subscribe(topic,2)
      
      foundTopic = False
      for t in self.subscriptions:
        if t[0] == topic:
          foundTopic = True
          t[1] = True
          break
      if not foundTopic:
        self.subscriptions.append([topic,True])
      
  def unsubscribe(self,topics):
    for topic in topics:
      print('Mqtt unsubscribe to topic:',topic)
      self.client.unsubscribe(topic)
      
      for t in self.subscriptions:
        if t[0] == topic:
          t[1] = False
          break

  def publishCsv(self,topic,data,qos=2):
    if len(data) > 0:
      tStart = time.time()
      result = self.client.publish(topic,data,qos)
      self.dataInQueue = True
      #result.wait_for_publish()
      status = result[0]
      if status != 0:
        print("Failed to send msg to broker.")
      else:
        dt = time.time()-tStart
        dtms = round(dt*10000)/10
        rate = getsizeof(data)/(dt*1000)
        
        self.msgsSinceLastUpdate += 1
        self.avgTransferRate = 0.3*self.avgTransferRate + 0.7*rate
        
        dt = time.time() - self.lastUpdateTime
        if dt > 1:
          msgsPerSec = self.msgsSinceLastUpdate / dt
          #print('Mqtt stats (msg/sec, kbps):'+str(round(msgsPerSec))+', '+str(round(self.avgTransferRate*10)/10))
          self.lastUpdateTime = time.time()
          self.msgsSinceLastUpdate = 0
    else:
      print('Cloud connection - empty payload, not sending msg.')
