#!/usr/bin python

import time
import os
import subprocess
import ssl
import json
import argparse
from collections import OrderedDict
from sys import getsizeof
import yaml
import rospy
from nrc_msgs.msg import GpsState
import rospkg
from threading import Lock

foundPaho = True
try:
  import paho.mqtt.client as mqtt_client
except:
  foundPaho = False

mutex = Lock()
usingMailbox = False

subscribeTopics = ["dt/tfc/vehicle/telemetry"]
mqtt_filename = 'mqtt_connection_config.yaml'

#TLS_protocol_version = ssl.PROTOCOL_TLSv1_2

class MsgStats:
  def __init__(self,typeStrIn):
    self.typeStr = typeStrIn
    self.tLastUpdate = 0.
    self.msgCount    = 0.
    self.kbitsTotal  = 0.
    self.msgsPerSec  = 0.
    self.kbitsPerSec = 0.
  
  def update(self,kbits):
    if time.time() - self.tLastUpdate < 5.:
      self.msgCount   += 1.
      self.kbitsTotal += kbits
      #print(self.typeStr,self.msgCount,kbits,self.kbitsTotal)
    else:
      tNow = time.time()
      self.msgsPerSec  = self.msgCount / (tNow - self.tLastUpdate)
      self.kbitsPerSec = self.kbitsTotal / (tNow - self.tLastUpdate)
      self.tLastUpdate = tNow
      self.msgCount    = 0.
      self.kbitsTotal  = 0.
      self.printStr    = True
      strOut = 'Mqtt '+self.typeStr+' stats (msg/sec, KBps): '\
                    +str(round(self.msgsPerSec))+', '\
                    +str(round(self.kbitsPerSec*10/8)/10)
      print(strOut)

class CloudConnection:
  def __init__(self,clientId, brokerName):
    self.foundPaho = foundPaho
    self.name = clientId
    self.broker = brokerName
    self.clientId = self.name+'_'+time.strftime("%Y-%m-%d-%H-%M-%S")
    self.filename = rospkg.RosPack().get_path('nrc_av_ui')+'/config/'+mqtt_filename
    self.isConnected = False
    self.configInfo = self.loadBrokerConfigs()
    self.configInfo['MQTT_SERVER'] = os.environ['MQTT_SERVER'] if 'MQTT_SERVER' in os.environ else self.configInfo['MQTT_SERVER']
    self.configInfo['MQTT_PORT'] = int(os.environ['MQTT_PORT']) if 'MQTT_PORT' in os.environ else self.configInfo['MQTT_PORT']
    self.configInfo['MQTT_USER'] = os.environ['MQTT_USER'] if 'MQTT_USER' in os.environ else self.configInfo['MQTT_USER']
    self.configInfo['MQTT_PASSWORD'] = os.environ['MQTT_PASSWORD'] if 'MQTT_PASSWORD' in os.environ else self.configInfo['MQTT_PASSWORD']
    self.configInfo['MQTT_TLS'] = self.configInfo['MQTT_TLS'] = os.environ['MQTT_TLS'].lower() == 'true' if 'MQTT_TLS' in os.environ else self.configInfo['MQTT_TLS']
    self.configInfo['PROTOCOL'] = ssl.PROTOCOL_TLSv1_2
    self.client = []
    self.mailbox = []
    self.subscriptions = []
    self.unsubscriptions = []
    self.dataInQueue = False
    self.msgInStats = MsgStats('Rx')
    self.msgOutStats = MsgStats('Tx')
    self.quicTunnel = False

  def loadBrokerConfigs(self):
    config_file = open(self.filename, 'r')
    configs = yaml.safe_load(config_file)
    if self.broker in configs['Brokers'].keys():
      mqtt_configs = configs['Brokers'][self.broker]
      return mqtt_configs
    else:
      print("Check mqtt configuration file. Available brokers: ", configs['Brokers'].keys())
      return None
    
  #def updateConfig(self,text):
    #keys = self.configInfo.keys()
    #lines = text.split('\n')
    #for line in lines:
      #for key in keys:
        #if key in line:
          #value = line.split(': ')[1]
          #self.configInfo[key] = value
    
  def init(self):
    if foundPaho:
      if False and self.broker == 'quic':
        print('Setup quic tunnel')
        pathToSshKey = os.path.expanduser('~')+'/.ssh3/id_quic'
        cmd = '/usr/local/scripts/quic-link_verbose.sh -h avt-mqtt.nrcsv.com -k '+pathToSshKey+' &'
        print(cmd)
        proc = subprocess.Popen(
          [cmd],shell=True,
          stdout = subprocess.DEVNULL,
          stderr = subprocess.STDOUT)
        time.sleep(0.5)
        self.quicTunnel = True
        print('Done setup quic tunnel')
      
      self.client = self.connect_mqtt()
      self.client.loop_start()
    
  def getMail(self):
    with mutex:
      usingMailbox = True
      mail = self.mailbox[:]
      self.mailbox = []
      usingMailbox = False
    return mail

  def connect_mqtt(self):
      def on_connect(client, userdata, flags, rc):
          if rc == 0:
              self.isConnected = True
              print("Connected to MQTT Broker!")
              
              resubscribeTopics = []
              for t in self.subscriptions:
                if t[1] == True:
                  client.subscribe(t[0],t[2])
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
        
        kbits = getsizeof(message.payload)/1000
        self.msgInStats.update(kbits)
        
        if ('snp' in message.topic) and ('data' in message.topic):
          msg['data'] = message.payload
        elif 'imgStream' in message.topic:
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
      
      print ("Create mqtt connection:",self.clientId) 
      client_id = 'natcsv-mqtt-client.'+self.clientId
      client = mqtt_client.Client(client_id, clean_session=True)
      client.username_pw_set(self.configInfo['MQTT_USER'], self.configInfo['MQTT_PASSWORD'])
      
      if self.configInfo['MQTT_TLS']:
          # enable SSL
          context = ssl.SSLContext(self.configInfo['PROTOCOL'])
          # do not check the cert hostname
          context.check_hostname = False
          client.tls_set_context(context)

      client.on_connect = on_connect
      client.on_disconnect = on_disconnect
      print(self.configInfo['MQTT_SERVER'], self.configInfo['MQTT_PORT'], self.configInfo['MQTT_USER'], self.configInfo['MQTT_PASSWORD'])
      client.connect(self.configInfo['MQTT_SERVER'], self.configInfo['MQTT_PORT'])
      client.on_subscribe = on_mqtt_subscribe
      client.on_message = on_mqtt_message
      client.on_publish = on_publish
      return client

  def subscribe(self,topics,qos):
    for topic in topics:
      if foundPaho:
        print('Mqtt subscribe (topic/qos):',topic,qos)
        self.client.subscribe(topic,qos)
      
      foundTopic = False
      for t in self.subscriptions:
        if t[0] == topic:
          foundTopic = True
          t[1] = True
          break
      if not foundTopic:
        self.subscriptions.append([topic,True,qos])
      
  def unsubscribe(self,topics):
    for topic in topics:
      if foundPaho:
        print('Mqtt unsubscribe to topic:',topic)
        self.client.unsubscribe(topic)
      
      for t in self.subscriptions:
        if t[0] == topic:
          t[1] = False
          break

  def publishCsv(self,topic,data,qos):
    if len(data) > 0:
      tStart = time.time()
      status = 0
      if foundPaho:
        result = self.client.publish(topic,data,qos)
        status = result[0]
        self.dataInQueue = True
      if status != 0:
        print("Failed to send msg to broker.")
      else:
        kbits = getsizeof(data)/1000
        self.msgOutStats.update(kbits)
    else:
      print('Cloud connection - empty payload, not sending msg.')
