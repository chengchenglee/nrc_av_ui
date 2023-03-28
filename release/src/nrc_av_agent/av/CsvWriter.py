#!/usr/bin/env python

import numpy as np

# Ros  Messages
import rospy
import time

# File system saving, etc
import os

# CSV check_output
import csv

class CsvWriter:
  def __init__(self):
    self.csvFileName = "default"
    self.vehiclePose = np.zeros((3,1))
    self.vehicleSpeed = np.zeros((2,1))
    self.vehicleMileage = 0
    self.avEngaged = 0
    self.BRK_Override = 0
    self.APO_Override = 0
    self.avEngagedMileage = 0
    self.brkOverrideTime = 0
    self.apoOverrideTime = 0
    self.towerCamFrontHistory = []
    self.updateCsvThisCycle = 0
    self.lastCsvUpdate = 0
    
  def openCsv(self):
    # Create datalogging csv
    csvDir = os.path.join(os.path.expanduser("~"), 'projects/disengagementData/')
    dirExists = os.path.isdir(csvDir)
    if not dirExists:
      os.mkdir(csvDir)

    todaysDate = ''.join(time.strftime("%Y%m%d")+".csv")
    self.csvFilename = os.path.join(csvDir,todaysDate)
    csvExists = os.path.isfile(self.csvFilename)
    if not csvExists:
      print("Create new csv for disengagement report: " + self.csvFilename)
      with open(self.csvFilename, mode='w') as csvFile:
        csvFileWriter = csv.writer(csvFile, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
        csvFileWriter.writerow(['year','month','day','hour','min','sec','x(m)','y(m)','v(m/s)','driverBrkTime','driverApoTime','avEngagedFlg','abruptDisengagement','monitorClosed','avEngagedMileage(m)'])

  def updateData(self, sensor):
    if sensor.labelName == "GPS":
      self.vehiclePose[0,0] = sensor.getData()[0,0]
      self.vehiclePose[1,0] = sensor.getData()[1,0]
      self.vehicleSpeed = sensor.getData()[3,0]
      if self.avEngaged:
        dS = sensor.getData()[2,0] - self.vehicleMileage
        if np.abs(dS) < 5 and self.avEngaged:
          self.avEngagedMileage = self.avEngagedMileage + dS
      self.vehicleMileage = sensor.getData()[2,0]

    elif sensor.labelName == "CAR":
      if self.avEngaged == 1 and sensor.data[0,0] == 0:
        # Falling edge
        self.avEngaged = 0
        self.updateCsvThisCycle = 1
      elif self.avEngaged == 0 and sensor.data[0,0] == 1:
        # Rising edge
        self.avEngaged = 1
        self.updateCsvThisCycle = 1
        self.avEngagedMileage = 0.0
        self.brkOverrideTime = 0
        self.apoOverrideTime = 0
      
      if self.avEngaged:
        self.brkOverrideTime = self.brkOverrideTime + sensor.data[1,0]
        self.apoOverrideTime = self.apoOverrideTime + sensor.data[2,0]
        #print("Tracking av engagement: (Brake, APO)" + str(self.brkOverrideTime)+", "  + str(self.apoOverrideTime))
        
      self.BRK_Override = (sensor.data[1,0] > 0)
      self.APO_Override = (sensor.data[2,0] > 0)

  def checkWriteCsv(self,terminateSignal):
    if self.updateCsvThisCycle == 1 or terminateSignal:
      self.saveData(terminateSignal)
      self.updateCsvThisCycle = 0

  def saveData(self,terminateSignal):
    print ("Updating csv.")
    if self.avEngaged == 1 and not terminateSignal:
      # Intermediate data
      a = 10
    elif self.avEngaged == 0 or terminateSignal:
      if self.avEngagedMileage > 10:
        abruptDisengagement = self.vehicleSpeed > 5 and self.BRK_Override
        print ("Save disengagement to csv.")
        self.lastCsvUpdate = rospy.Time.now().to_sec()
        with open(self.csvFilename, mode='a') as csvFile:
          year = time.strftime("%Y")
          month = time.strftime("%m")
          day = time.strftime("%d")
          hour = time.strftime("%H")
          minute = time.strftime("%m")
          second = time.strftime("%S")
          #timeNow = time.strftime("%Y%m%d-%H%m%s")
          csvFileWriter = csv.writer(csvFile, delimiter=',', quotechar='"', quoting=csv.QUOTE_MINIMAL)
          csvFileWriter.writerow([year,month,day,hour,minute,second,\
                                  round(self.vehiclePose[0,0],2),round(self.vehiclePose[1,0],2),round(self.vehicleSpeed,2),\
                                  round(self.brkOverrideTime),round(self.apoOverrideTime),self.avEngaged,abruptDisengagement,terminateSignal,round(self.avEngagedMileage,2)])
      self.avEngagedMileage = 0
        
    
    
    
    
    
