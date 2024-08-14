
class TelemetryEntry:
  def __init__(self,value):
    self.value = value

class TelemetryData:
  def __init__(self):
    
    # Define components of telemetry message
    # Base telemetry data
    self.engaged      = TelemetryEntry(0)
    self.taxiStatus   = TelemetryEntry(0)
    self.teleop       = TelemetryEntry(0)
    
    # Door data
    self.fl_door_clsd = TelemetryEntry(0)
    self.fr_door_clsd = TelemetryEntry(0)
    self.bl_door_clsd = TelemetryEntry(0)
    self.br_door_clsd = TelemetryEntry(0)
    
    # Driver data
    self.drvAccel     = TelemetryEntry(0)
    self.drvBrake     = TelemetryEntry(0)
    self.drvSteer     = TelemetryEntry(0)
    
    # Add to data structure for sending/receiving
    self.data = []
    self.data.append([])
    self.data[0].append(TelemetryEntry('a'))
    self.data[0].append(self.engaged)
    self.data[0].append(self.taxiStatus)
    self.data[0].append(self.teleop)
    
    self.data.append([])
    self.data[1].append(TelemetryEntry('d'))
    self.data[1].append(self.fl_door_clsd)
    self.data[1].append(self.fr_door_clsd)
    self.data[1].append(self.bl_door_clsd)
    self.data[1].append(self.br_door_clsd)
    
    self.data.append([])
    self.data[2].append(TelemetryEntry('or'))
    self.data[2].append(self.drvAccel)
    self.data[2].append(self.drvBrake)
    self.data[2].append(self.drvSteer)
  
  def toMsg(self):
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
        if lineData[0] == self.data[i][AGENT_LINE_HEADER].value:
          if len(lineData) >= len(self.data[i]):
            for j in range(len(self.data[i])):
              self.data[i][j].value = lineData[j]
    
    #for i in range(len(self.data)):
      #for j in range(1,len(self.data[i])):
        #print(self.data[i][j].value)
    
    
    
