#!/usr/bin/env python

import rospy
import json
import numpy as np
import os


def avEvent(avEvent_timeList, eventName, snapshotStartTime, infoDict):
    
    for avEv in avEvent_timeList:
        timeSinceSnapshotStartTime = (avEv - snapshotStartTime).to_sec()
        if timeSinceSnapshotStartTime > 0:      # av was engaged or disengaged while snapshot was in progress. Only then record this entry in the snapshot file.
            if eventName not in infoDict:       # Durations are not recorded for avEngaged or avDisengaged events, because those may extend beyond the snapshot duration.
                infoDict[eventName] = {'count': 1, 'startTime': [(avEv).to_sec()], 'timeSinceSnapshotStartTime': [timeSinceSnapshotStartTime], 'duration': []}
            else:
                infoDict[eventName]['count'] += 1
                infoDict[eventName]['startTime'].append((avEv).to_sec())
                infoDict[eventName]['timeSinceSnapshotStartTime'].append(timeSinceSnapshotStartTime)
                infoDict[eventName]['duration'].append([])
    
    return infoDict


def create_json_file(csvDir, filename, snapshotStartTime, avEngaged_startTimeList, avEngaged_stopTimeList, detailsDict):

    with open(os.path.join(csvDir, '{}.json'.format(filename)), 'w') as infoFile:
        
        infoDict = {'snapshotStartTime': '{} secs {} nsecs'.format(snapshotStartTime.secs, snapshotStartTime.nsecs),
                    'totalEventCount': len(detailsDict['prefixList'])}

        infoDict = avEvent(avEngaged_startTimeList, 'avEngaged', snapshotStartTime, infoDict)
        infoDict = avEvent(avEngaged_stopTimeList, 'avDisengaged', snapshotStartTime, infoDict)

        for cc in range(len(detailsDict['prefixList'])):
            eventName = detailsDict['prefixList'][cc]
            eventDuration = detailsDict['durationList'][cc]
            eventStartTime = detailsDict['startTimeList'][cc]
            timeSinceSnapshotStartTime = (eventStartTime - snapshotStartTime).to_sec()
            
            if eventName not in infoDict:
                infoDict[eventName] = {'count': 1, 'startTime': [(eventStartTime).to_sec()], 'timeSinceSnapshotStartTime': [timeSinceSnapshotStartTime], 'duration': [eventDuration]}
            else:
                infoDict[eventName]['count'] += 1
                infoDict[eventName]['startTime'].append((eventStartTime).to_sec())
                infoDict[eventName]['timeSinceSnapshotStartTime'].append(timeSinceSnapshotStartTime)
                infoDict[eventName]['duration'].append(eventDuration)

        json.dump(infoDict, infoFile, indent=4, separators=(',', ': '))
        
        
