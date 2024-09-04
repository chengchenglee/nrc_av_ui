
class WaypointEntry:
  def __init__(self,dataIn):
    self.value = []
    self.x  = dataIn[0]
    self.y  = dataIn[1]
    self.th = dataIn[2]
    
  def toStr(self):
    csvStr = ','+str(self.x)+','+str(self.y)+','+str(self.th)
    return csvStr

class WaypointData:
  def __init__(self,waypointsList = []):
    self.waypoints = []
    for i in range(len(waypointsList)):
      self.waypoints.append(WaypointEntry(waypointsList[i]))
    
  def toMsg(self):
    csvStr = ''
    csvStr = 'w'
    for i in range(len(self.waypoints)):
      csvStr += self.waypoints[i].toStr()
    #print('mqtt_defs, toMsg:\n'+str(csvStr))
    return csvStr
    
  def fromMsg(self, msgIn):
    for lineData in msgIn['data']:
      if lineData[0] == 'w':
        self.waypoints = []
        numPoints = (len(lineData)-1)/3
        for i in range(numPoints):
          groupIdx = 1+3*i
          self.waypoints.append(WaypointEntry(lineData[groupIdx:groupIdx+3]))
    if False:
      for i in range(len(self.waypoints)):
        print('Waypoint '+str(i)+'=>'+self.waypoints[i].toStr())
