#!/usr/bin/env python

import rospy
import json
import numpy as np
import os


def create_json_file(csvDir, filename, snapshotStartTime, avEngaged_startTimeList, avEngaged_stopTimeList, prefixList, durationList, startTimeList):

    with open(os.path.join(csvDir, '{}.json'.format(filename)), 'w') as infoFile:
        
        infoDict = {'snapshotStartTime': '{} secs {} nsecs'.format(snapshotStartTime.secs, snapshotStartTime.nsecs),
                    'totalEventCount': len(prefixList)}

        for avEnSt in avEngaged_startTimeList:
            timeSinceSnapshotStartTime = (avEnSt - snapshotStartTime).to_sec()
            if timeSinceSnapshotStartTime > 0:      # av was engaged while snapshot was in progress. Only then record this entry in the snapshot file.
                eventName = 'avEngaged'
                if eventName not in infoDict:       # Durations are not recorded for avEngaged or avDisengaged events, because those may extend beyond the snapshot duration.
                    infoDict[eventName] = {'count': 1, 'startTime': [(avEnSt).to_sec()], 'timeSinceSnapshotStartTime': [timeSinceSnapshotStartTime], 'duration': []}
                else:
                    infoDict[eventName]['count'] += 1
                    infoDict[eventName]['startTime'].append((avEnSt).to_sec())
                    infoDict[eventName]['timeSinceSnapshotStartTime'].append(timeSinceSnapshotStartTime)
                    infoDict[eventName]['duration'].append([])
                
        for avEnSt in avEngaged_stopTimeList:
            timeSinceSnapshotStartTime = (avEnSt - snapshotStartTime).to_sec()
            if timeSinceSnapshotStartTime > 0:      # av was disengaged while snapshot was in progress. Only then record this entry in the snapshot file.
                eventName = 'avDisengaged'
                if eventName not in infoDict:       # Durations are not recorded for avEngaged or avDisengaged events, because those may extend beyond the snapshot duration.
                    infoDict[eventName] = {'count': 1, 'startTime': [(avEnSt).to_sec()], 'timeSinceSnapshotStartTime': [timeSinceSnapshotStartTime], 'duration': []}
                else:
                    infoDict[eventName]['count'] += 1
                    infoDict[eventName]['startTime'].append((avEnSt).to_sec())
                    infoDict[eventName]['timeSinceSnapshotStartTime'].append(timeSinceSnapshotStartTime)
                    infoDict[eventName]['duration'].append([])

        for cc in range(len(prefixList)):
            eventName = prefixList[cc]
            eventDuration = durationList[cc]
            eventStartTime = startTimeList[cc]
            timeSinceSnapshotStartTime = (eventStartTime - snapshotStartTime).to_sec()
            
            if eventName not in infoDict:
                infoDict[eventName] = {'count': 1, 'startTime': [(eventStartTime).to_sec()], 'timeSinceSnapshotStartTime': [timeSinceSnapshotStartTime], 'duration': [eventDuration]}
            else:
                infoDict[eventName]['count'] += 1
                infoDict[eventName]['startTime'].append((eventStartTime).to_sec())
                infoDict[eventName]['timeSinceSnapshotStartTime'].append(timeSinceSnapshotStartTime)
                infoDict[eventName]['duration'].append(eventDuration)

        json.dump(infoDict, infoFile, indent=4, separators=(',', ': '))
        
        
