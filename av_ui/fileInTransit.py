#!/usr/bin/python

import os
import glob
import time

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
    self.directory = '/'.join(filename.split('/')[:-1])
    print(self.directory)
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
  
  def splitPayload(self, chunk):
    headerStr = ''
    commaCount = 0
    for i in range(0,100):
      b = ord(chunk[i])
      if 0 <= b and b < 128:  #is ascii
        #character = format(b, "s")
        character = chr(b)
        if character == ',':
          commaCount += 1
          character = '_'
          
        if commaCount >= 3:
          print('Extracted header string:'+headerStr)
          return [headerStr,chunk[i:]]
        else:
          headerStr += character
      else:
        break

    return ['InvalidHeader','']
    
  def saveChunk(self,header,chunk):
    todaysDate = ''.join(time.strftime("%Y-%m-%d"))
    tempDir = '/opt/data/snapshots/'+todaysDate+'/temp/'
    isDir = os.path.isdir(tempDir)
    if not isDir:
      os.makedirs(tempDir)
    
    chunkName = header+'.tmp'
    #chunkFile = open(tempDir+'/'+chunkName,'wb')
    #chunkFile.write(chunk)

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
    
    
    
    
