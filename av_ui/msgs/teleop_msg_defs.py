
OBJ_ID_IDX   = 0
POS_X_IDX    = 1
POS_Y_IDX    = 2
POS_TH_IDX   = 3
TELEOP_ENUMS = 4

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
    #print('Teleop cmd msg:',csvStr)
    self.seq += 1
    if self.seq >= 100: self.seq = 1
    return csvStr
    
  def fromMsg(self, msgData, stamp):
    self.commands = []
    self.stamp = stamp
    for line in msgData:
      if len(line) < 1: continue
      if line[0] == 's' and len(line) >= 2:
        self.seq = int(line[1])
      elif line[0] == 'c' and len(line) >= TELEOP_ENUMS+1:
        goodData = True
        newEntry = TeleopEntry()
        newEntry.teleopType = line[1]
        for i in range(TELEOP_ENUMS):
          try: newEntry.values[i] = float(line[i+2])
          except ValueError: goodData = False
        if goodData: self.commands.append(newEntry)

    #print('Rx Teleop (stamp/seq/cmds):',self.stamp,self.seq,len(self.commands))
    #if len(self.commands) > 0:
      #for cmd in self.commands:
        #print(cmd.teleopType,cmd.values)
