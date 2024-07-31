#!/usr/bin/python

import os
import glob
import time

class FileInTransit:
  def __init__(self,pathToBags):
    self.fileOpen = 0
    self.pathToBags = pathToBags
    self.fullname = ''
    self.filename = ''
    self.directory = ''
    self.fileread = ''
    self.filesize = 0
    self.chunkIdx = 0
    self.chunkSize = 500
    self.chunkSendTime = 0
    self.bytesSent = 0
    self.state = ['Idle','Initializing']
    self.debounceNewFile = 5
  
  def setNew(self,fileInfo):
    self.fileOpen = 1
    self.fullname = fileInfo[0]
    self.directory = '/'.join(self.fullname.split('/')[:-1])
    self.filename = self.fullname.split('/')[-1]
    self.filename = self.filename.rstrip('.bag')
    print('============= Open file: '+self.filename+', '+str(fileInfo[1])+' =============')
    print('============= Directory: '+self.directory+' =============')
    self.fileread = open(self.fullname,'rb')
    self.filesize = os.path.getsize(self.fullname)
    print('Filesize: '+str(self.filesize))
    
    self.fileread.read(fileInfo[1])
    self.bytesSent = fileInfo[1]
    self.chunkSize = 500
  
  def transferCmplt(self):
    print('============= Transfer Cmplt: '+self.filename+' =============')
    self.fileOpen = 0
    self.fileread.close()
    
    # Check if sent directory exists
    doneDir = self.pathToBags+'sent/'
    isDir = os.path.isdir(doneDir)
    if not isDir:
      os.makedirs(doneDir)
    
    # Move to sent directory
    newFilename = doneDir+self.filename+'.bag'
    os.rename(self.fullname,newFilename)
    self.state = ['Idle',', Transfer complete']
    
  def cancelTransfer(self):
    if self.fileOpen == 1:
      print('Cancel transfer, missing remote_snapshot heartbeat.')
      self.fileOpen = 0
      self.fileread.close()
    self.state = ['Idle','Transfer cancelled']
  
  def getPayload(self):
    # Data
    chunk = self.fileread.read(self.chunkSize)
    chunkSize = len(chunk) # Can be smaller than chunkSize at end of file
    
    if chunkSize < self.chunkSize:
      self.transferCmplt()
    
    # Data header
    startByte = self.bytesSent
    endByte = self.bytesSent + chunkSize - 1
    headerStr = str(self.filename)+','+str(startByte)+','+str(endByte)+','+str(self.filesize-1)+','
    header = headerStr.encode('ascii')
    #print('Sending:',headerStr,str(chunkSize))
    
    self.bytesSent += chunkSize
    return header+chunk
  
  def splitPayload(self, chunk):
    headerStr = ''
    headerVec = []
    commaCount = 0
    for i in range(0,100):
      if commaCount >= 4:
        print('Extracted header string:',headerVec)
        return [headerVec,chunk[i:]]
      
      b = 0
      if type(chunk[i]) is int:
        b = chunk[i]
      else:
        b = ord(chunk[i])
        
      if 0 <= b and b < 128:  #is ascii
        #character = format(b, "s")
        character = chr(b)
        if character == ',':
          commaCount += 1
          headerVec.append(headerStr)
          headerStr = ''
        else:
          headerStr += character
      else:
        break

    return ['InvalidHeader','']
  
  def getPartialList(self):
    payload = ''
    tempDir = self.pathToBags+'temp/'

    # Check for unfinished files    
    if os.path.isdir(tempDir):
      tmpFiles = glob.glob(tempDir+"*.tmp")
      for tmp in tmpFiles:
        tmpFilename = tmp.split('/')[-1]
        fileHeader = tmpFilename.split('.')
        if len(fileHeader) == 5 and not fileHeader[2] == fileHeader[3]:
          payload += 'f,'+fileHeader[0]+','+fileHeader[2]+'\n'
        
    if payload == '':
      payload = 'f,None\n'
    return payload
    
  def saveChunk(self,header,chunk):
    tempDir = self.pathToBags+'temp/'
    isDir = os.path.isdir(tempDir)
    if not isDir:
      os.makedirs(tempDir)
      
    # Check if we can append to existing file
    tmpFiles = glob.glob(tempDir+"*.tmp")
    for tmp in tmpFiles:
      tmpFilename = tmp.split('/')[-1]
      fileHeader = tmpFilename.split('.')
      if len(fileHeader) == 5 and fileHeader[0] == header[0]:
        if int(fileHeader[2])+1 == int(header[1]):
          # Append data to existing tmp file
          print('Append to existing file')
          chunkFile = open(tmp,'ab')
          chunkFile.write(chunk)
          chunkFile.close()
          
          # Rename tmp file to reflect start/end byte information
          if header[2] == fileHeader[3]:
            newFilename = '.'.join([fileHeader[0],'bag'])
            newFilename = tempDir+newFilename
            os.rename(tmp,newFilename)
          else:
            newFilename = '.'.join([fileHeader[0],fileHeader[1],header[2],fileHeader[3],'tmp'])
            newFilename = tempDir+newFilename
            os.rename(tmp,newFilename)
          return
    
    # Create new tmp file to add data
    print('Create new file:',header)
    chunkName = '.'.join(header)+'.tmp'
    print(chunkName)
    chunkFile = open(tempDir+'/'+chunkName,'wb')
    chunkFile.write(chunk)

  def updateChunkSize(self,dt):
    if dt < 0.6:
      self.chunkSize = min(500000, self.chunkSize+5000)
    elif dt > 0.8:
      self.chunkSize = max(1000,self.chunkSize-20000)

