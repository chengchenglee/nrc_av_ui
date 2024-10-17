
from visualization_msgs.msg import Marker, MarkerArray

OBJ_ID_IDX   = 0
POS_X_IDX    = 1
POS_Y_IDX    = 2
POS_TH_IDX   = 3
POS_V_IDX    = 4
POS_W_IDX    = 5
TELEOP_ENUMS = 6

class TeleopEntry:
  def __init__(self,typeIn = '',dataIn = []):
    self.teleopType = typeIn
    self.values = dataIn
    if len(self.values) < TELEOP_ENUMS:
      self.values = []
      for i in range(TELEOP_ENUMS):
        self.values.append(0)
        
  # Initialize from different header
  @classmethod
  def fromOru(cls,objId, xyth):
    action = 'ORU'
    data = []
    for i in range(TELEOP_ENUMS):
      data.append(0)
      
    data[OBJ_ID_IDX] = objId
    data[POS_X_IDX]  = xyth[0]
    data[POS_Y_IDX]  = xyth[1]
    data[POS_TH_IDX] = xyth[2]
    
    if (len(xyth) >= 5):
      data[POS_V_IDX]  = xyth[3]
      data[POS_W_IDX]  = xyth[4]
    else:
      data[POS_V_IDX]  = 0
      data[POS_W_IDX]  = 0
      
    return cls(action,data)
  
  def objId(self):
    return self.values[OBJ_ID_IDX]
  
  def setAction(self,actionIn):
    self.teleopType = actionIn

class TeleopCmdData:
  def __init__(self):
    self.stamp = 0
    self.seq = 0
    self.commands = []
    
  def isValid(self):
    return len(self.commands)>0
    
  def toMsg(self):
    csvStr = ''
    csvStr = 's,'+str(self.seq)+'\n'
    for i in range(len(self.commands)):
      csvStr += 'c,'+self.commands[i].teleopType
      for j in range(TELEOP_ENUMS):
        csvStr += ','+str(self.commands[i].values[j])
      csvStr += '\n'
    self.seq += 1
    if self.seq >= 100: self.seq = 1
    return csvStr
    
  def fromMsg(self, msgData, stamp):
    self.commands = []
    self.stamp = stamp
    for line in msgData:
      if len(line) < 1: continue
    
      # Read time stamp
      if line[0] == 's' and len(line) >= 2:
        self.seq = int(line[1])
        
      # Read msg counter
      elif len(line) >= 2 and line[0] == 'idx':
        self.agentMsgCount = int(line[1])
      
      # Get list of teleop commands
      elif line[0] == 'c' and len(line) >= TELEOP_ENUMS+1:
        goodData = True
        newEntry = TeleopEntry()
        newEntry.teleopType = line[1]
        for i in range(TELEOP_ENUMS):
          if i == OBJ_ID_IDX:
            try: newEntry.values[i] = int(line[i+2])
            except ValueError: goodData = False
          else:
            try: newEntry.values[i] = float(line[i+2])
            except ValueError: goodData = False
          
        if goodData: self.commands.append(newEntry)

    #print('Rx Teleop (stamp/seq/cmds):',self.stamp,self.seq,len(self.commands))
    #if len(self.commands) > 0:
      #for cmd in self.commands:
        #print(cmd.teleopType,cmd.values)
        
  def toRosMsg(self, stamp):
    ma = MarkerArray()
    
    for cmd in self.commands:
      m = Marker()
      m.header.stamp = stamp
      if cmd.teleopType == 'GAL' or cmd.teleopType == 'GAR' or cmd.teleopType == 'FTrj' or cmd.teleopType == 'FVV':
        m.text               = cmd.teleopType
        m.id                 = cmd.values[OBJ_ID_IDX]
        m.pose.position.x    = cmd.values[POS_X_IDX]
        m.pose.position.y    = cmd.values[POS_Y_IDX]
        m.pose.orientation.z = cmd.values[POS_TH_IDX]
        
        # Append speed information
        m.pose.orientation.x = cmd.values[POS_V_IDX]
        m.pose.orientation.y = cmd.values[POS_W_IDX]
        ma.markers.append(m)
      elif cmd.teleopType == 'STOP':
        m.text = cmd.teleopType
        ma.markers.append(m)
    
    return ma
        
          
      
      
      
      
      
      
      
      
