ffmpegTransportExists = True
try:
  from ffmpeg_image_transport_msgs.msg import FFMPEGPacket
except ImportError:
  ffmpegTransportExists = False

stampIdx = 0
seqIdx = 1
widthIdx = 2
heightIdx = 3
pktsIdx = 4
flgsIdx = 5
encIdx = 6
numEnums = 7

class ImgStreamData:
  def __init__(self):
    
    # Define components of telemetry message
    # Base telemetry data
    self.fields = []
    self.fields.append(0)
    self.fields.append(0)
    self.fields.append(512)
    self.fields.append(512)
    self.fields.append('hevc_nvenc')
    self.fields.append(0)
    self.fields.append(0)
    self.imgPkt    = []
    self.unprocessedFrame = False
  
  def width(self):
    return self.fields[widthIdx]
  
  def height(self):
    return self.fields[heightIdx]
  
  def keyframe(self):
    return self.fields[flgsIdx] == 1
  
  def isFfmpeg(self):
    return self.fields[encIdx] != 'jpeg'
  
  def toMsg(self,rosMsg,width = 0, height = 0):
    isFfmpeg = hasattr(rosMsg,"encoding")
    
    if isFfmpeg:
      self.fields[stampIdx]  = int(rosMsg.header.stamp.to_sec()*100)
      self.fields[seqIdx]    = rosMsg.header.seq
      self.fields[widthIdx]  = rosMsg.img_width
      self.fields[heightIdx] = rosMsg.img_height
      self.fields[pktsIdx]   = rosMsg.pts
      self.fields[flgsIdx]   = rosMsg.flags
      self.fields[encIdx]    = rosMsg.encoding
    else:
      self.fields[stampIdx]  = int(rosMsg.header.stamp.to_sec()*100)
      self.fields[widthIdx]  = width
      self.fields[heightIdx] = height
      self.fields[pktsIdx]   = 0
      self.fields[flgsIdx]   = 0
      self.fields[encIdx]    = 'jpeg'
    
    headerStr = ''
    for i in range(0,numEnums):
      headerStr = headerStr+str(self.fields[i])+','
    
    header = headerStr.encode('ascii')
    
    
    
    if False:
      if isFfmpeg:
        print('Pack ffmpeg message.')
      else:
        print('Pack jpeg message.')
      
    return header+rosMsg.data
    
  def fromMsg(self, dataIn):
    #print('\nParse img stream data')
    headerStr = ''
    headerVec = []
    commaCount = 0
    success = True
    for i in range(0,100):
      if commaCount >= 7:
        self.imgPkt = dataIn[i:]
        #print(['First bytes:',self.imgPkt[0:20]])
        self.unprocessedFrame = True
        #print(self.fields)
        break
        
      # Reading one byte at a time
      b = 0
      if type(dataIn[i]) is int:
        b = dataIn[i]
      else:
        b = ord(dataIn[i])
      
      if 0 <= b and b < 128:  #is ascii
        character = chr(b)
        if character == ',':
          if commaCount < encIdx:
            self.fields[commaCount] = int(headerStr)
          else:
            self.fields[encIdx] = headerStr
          commaCount += 1
          headerStr = ''
        else:
          headerStr += character
      else:
        success = False
        break
    
    return
