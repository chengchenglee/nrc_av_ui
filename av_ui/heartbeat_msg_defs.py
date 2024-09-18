import time

class HeartbeatEntry:
  def __init__(self,value):
    self.value = value

class HeartbeatData:
  def __init__(self, agentNameIn = 'leaf', agentTypeIn = 'AV4'):
    
    ## NOTE: This setup (self.varName and append(HeartbeatEntry) allows
    ## to get/set values in for-loops and also get/set values by name
    
    # Define components of heartbeat status
    self.agentName = HeartbeatEntry(agentNameIn)
    self.agentType = HeartbeatEntry(agentTypeIn)
    self.pos_x    = HeartbeatEntry(0.)
    self.pos_y    = HeartbeatEntry(0.)
    self.pos_th   = HeartbeatEntry(0.)
    self.spd      = HeartbeatEntry(0.)
    self.yawRate  = HeartbeatEntry(0.)
    self.lat      = HeartbeatEntry(0.)
    self.lon      = HeartbeatEntry(0.)
    self.msgCount = HeartbeatEntry(0)
    
    # Add to message to be sent/received
    self.data = []
    self.data.append([])
    self.data[0].append(HeartbeatEntry('a'))
    self.data[0].append(self.agentName)
    self.data[0].append(self.agentType)
    
    self.data.append([])
    self.data[1].append(HeartbeatEntry('p'))
    self.data[1].append(self.pos_x)
    self.data[1].append(self.pos_y)
    self.data[1].append(self.pos_th)
    self.data[1].append(self.spd)
    self.data[1].append(self.yawRate)
    self.data[1].append(self.lat)
    self.data[1].append(self.lon)
    
    self.data.append([])
    self.data[2].append(HeartbeatEntry('idx'))
    self.data[2].append(self.msgCount)
  
  def toMsg(self,msgCountIn):
    self.msgCount.value = msgCountIn
    csvStr = ''
    for i in range(len(self.data)):
      for j in range(len(self.data[i])):
        if j == 0 and i>0:
          csvStr += '\n'
        if j > 0:
          csvStr += ','
        csvStr += str(self.data[i][j].value)
    #print('mqtt_defs, toMsg:\n'+str(csvStr))
    return csvStr
    
  def fromMsg(self, msgIn):
    for lineData in msgIn['data']:
      for i in range(len(self.data)):
        if lineData[0] == self.data[i][0].value:
          numVals = min(len(self.data[i]),len(lineData))
          for j in range(numVals):
            self.data[i][j].value = lineData[j]
    
    if False:
      printStr = self.agentName.value == 'funi'
      for i in range(len(self.data)):
        lineData = ''
        for j in range(0,len(self.data[i])):
          lineData += str(self.data[i][j].value) +' '
        if self.data[i][0].value == 'p' and printStr:
          tnow = round(time.time()*100.)/100.
          print(tnow, lineData)
