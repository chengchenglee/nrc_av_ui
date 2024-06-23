#!/usr/bin/python

import os
import glob

class FileInTransit:
  def __init__(self):
    self.needFileFlg = 1
    self.filename = ''
    self.directory = ''
    self.fileread = ''
    self.filesize = 0
    self.chunkIdx = 0
    self.chunkSize = 500
    self.chunkSendTime = 0
    self.bytesSent = 0
    self.bytesRemaining = 0
  
  def needFile(self):
    return self.needFileFlg
  
  def setNew(self,filename):
    self.needFileFlg = 0
    print('============= Open file: '+filename+' =============')
    self.filename = filename
    #self.directory = filename.split('/')[:-1]
    #print(self.directory)
    self.fileread = open(self.filename,'rb')
    self.filesize = os.path.getsize(filename)
    self.bytesRemaining = self.filesize
    print('Filesize: '+str(self.filesize))
    self.bytesSent = 0
    self.chunkIdx = 0
    self.chunkSize = 500
    self.chunkHeader = 0
  
  def getPayload(self):
    self.bytesSent += self.chunkSize
    self.bytesRemaining -= self.chunkSize
    #print('FT (cSize/sent/rem): '+str(self.chunkSize)+', '+str(self.bytesSent)+', '+str(self.bytesRemaining))
    
    # Data
    chunk = self.fileread.read(self.chunkSize)
    
    # Data header
    headerStr = str(self.chunkIdx)+','+str(self.bytesSent)+','+str(self.bytesRemaining)+','
    header = headerStr.encode('ascii')
    
    self.chunkIdx += 1
    return header+chunk
  
  def header(self):
    return self.chunkHeader
  
  def getHeader(self, chunk):
    headerStr = ''
    commaCount = 0
    for i in range(0,100):
      b = chr(chunk[i])
      if b.isascii():
        character = format(b, "s")
        headerStr += character
        if character == ',':
          commaCount += 1
        if commaCount >= 3:
          break
      else:
        break
    #print('Extracted header string:'+headerStr)

  def updateChunkSize(self,dt):
    if dt < 0.08:
      self.chunkSize = min(200000, self.chunkSize+200)
    elif dt > 0.12:
      self.chunkSize = max(100,self.chunkSize-1000)
  
  def isDone(self):
    if self.bytesRemaining <= 0:
      return True
    else:
      return False
  
  def setDone(self):
    if self.needFileFlg == 0:
      self.needFileFlg = 1
      self.name = ''
      self.bytesSent = 0
      self.bytesRemaining = 0
      self.filesize = 0
      self.fileread.close()
    
    
    
    
