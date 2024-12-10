# This file needs to be run manually after every snapshot recording session.

import pandas as pd
import numpy as np
import os
import json
import time
import datetime


def convertToUnix(year, month, day):
    dt = datetime.datetime(year, month, day)
    return int(dt.timestamp())


if __name__ == '__main__':
    snapshotSaveDir = os.path.join(os.path.expanduser("~"), '/opt/data/snapshots/')
    typesOfTrigs = ['brkTap', 'brkOverride', 'accOverride', 'vehicleTurnedRight', 'vehicleTurnedLeft']
    totalCountsDict = {c: 0 for c in typesOfTrigs}
    dictOfSnaps = {}
    for t in typesOfTrigs:
        dictOfSnaps[t] = ['Total_count']
        dictOfSnaps[t+'_count'] = [0]
        
    earliestTimestamp = convertToUnix(datetime.datetime.now().year + 1, 1, 1)
    latestTimestamp = 0
    startTimeStampInFilename = ''
    endTimeStampInFilename = ''
    
    listOfFolders = os.listdir(snapshotSaveDir)
    
    for i in listOfFolders:
        snapFolder = os.path.join(snapshotSaveDir, i)
        listOfFiles = os.listdir(snapFolder)
        print('Processing snapshots from folder: {}'.format(snapFolder))
        
        for j in listOfFiles:
            if not 'json' in j:
                continue
            
            jsonFileLoc = os.path.join(snapFolder, j)
            with open(jsonFileLoc, 'r') as infoFile:
                infoDict = json.load(infoFile)
            
            print('Processing file: {}'.format(jsonFileLoc))
            for k, _ in dictOfSnaps.items():
                if 'count' in k:
                    continue
                
                if k in infoDict:
                    dictOfSnaps[k].append(j)
                    dictOfSnaps[k+'_count'].append(infoDict[k]['count'])
                    totalCountsDict[k] += infoDict[k]['count']
                else:
                    dictOfSnaps[k].append('_')
                    dictOfSnaps[k+'_count'].append(0)
                    
        # The date and time of the latest folder with snapshots are recorded 
        # in the name of the saved csv file. So that we know till which date 
        # this file has been updated.
        yr, mo, dy = i.split('-')
        unixTimestamp = convertToUnix(int(yr), int(mo), int(dy))
        if unixTimestamp > latestTimestamp:
            latestTimestamp = unixTimestamp
            endTimeStampInFilename = i
        if unixTimestamp < earliestTimestamp:
            earliestTimestamp = unixTimestamp
            startTimeStampInFilename = i
        
    
    # Putting the total counts in the 2nd row of the csv file.
    for k, v in dictOfSnaps.items():
        if not 'count' in k:
            dictOfSnaps[k+'_count'][0] = totalCountsDict[k]
    
    #print(dictOfSnaps)
                
    df = pd.DataFrame(dictOfSnaps)

    # Saving the dataframe
    df.to_csv('global_trigger_count_{}_to_{}.csv'.format(startTimeStampInFilename, endTimeStampInFilename), index=False)
    
    
    
