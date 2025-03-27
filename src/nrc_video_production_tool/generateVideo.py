import rospy
import argparse
import numpy as np
import rosbag
from nrc_utils import align_data, bag2json, interpolate_gt, lead_vehicles_gt, obj2box, obj2dict, generate_tr_json, quaternion_to_rotation_matrix
from tqdm import tqdm
from p_tqdm import p_map
from pathlib import Path
import json
# from pydantic import BaseModel
from viz import viz
from collections import defaultdict
from nrc_utils import get_transformation_matrix
import os

from sensor_msgs.msg import PointCloud2, PointField
import sensor_msgs.point_cloud2 as pc2
import ctypes
import struct
from std_msgs.msg import Header
from roslib import message
import cv2
import ros_numpy
import sensor_msgs
import math
import psycopg2

from ast import literal_eval
from ros_numpy import numpify
from scipy.spatial.transform import Rotation

global currentSpeed
global currentAccel

fourcc = cv2.VideoWriter_fourcc(*"mp4v")
snap_folder_name = "resim_videos"
#aws_bags_folder_name = "/home/users/sachin/projects/awsVideoProduction/awsBags/"
#frame_size = (3840, 2160)
frame_size = (2160, 1080)
#frame_size = (720, 480)
widthOfCameraFeed = int(frame_size[1]/2.5)
offsetOfCameraFeed = 50
tflImageWidth = 85
fps = 10
num_frames = 0
svalueCutOff = 1000

#Connect to rosbagdb for map generation
connectDB = 0
if(connectDB):
    conn = psycopg2.connect(host="lake01.ail-sv.com",database="rosbagdb",user="sachin",password="Oct11_ailsv")
    # create a cursor
    cur = conn.cursor()
    print("Connected to db")

def get_pc_from_ros_pc2_msg(msg):
    """ Returns point-cloud as a structured numpy array. 
    Note: can be used with any topic of message type 'sensor_msgs/PointCloud2'
    """
    msg.__class__ = sensor_msgs.msg.PointCloud2
    return ros_numpy.numpify(msg)

def get_tr_from_pose(pose):
    """
    Construct a transformation matrix from a pose.
    :param pose: NRC pose structure with position and orientation fields
    :return: 4x4 transform
    """
    position = np.zeros(3)
    orientation = np.zeros(4)
    position[0] = pose.position.x
    position[1] = pose.position.y
    position[2] = pose.position.z


    orientation[0] = pose.orientation.x
    orientation[1] = pose.orientation.y
    orientation[2] = pose.orientation.z
    orientation[3] = pose.orientation.w

    return get_transformation_matrix(position, orientation)


def get_tr_from_pose_msg(pose):
    """
    Construct a transformation matrix from a pose.
    :param pose: NRC pose structure with position and orientation fields
    :return: 4x4 transform
    """
    position = np.array(pose["position"])
    orientation = np.array(pose["orientation"])
    return get_transformation_matrix(position, orientation)

def convertPCToXyz(ros_point_cloud):
    # assert isinstance(ros_point_cloud[1], PointCloud2)
    #self.lock.acquire()
    #gen = pc2.read_points(ros_point_cloud[1], skip_nans=True)
    gen = ros_point_cloud[1].points

    x = []
    color = list(ros_point_cloud[1].channels[0].values)
    count = 0
    for y in list(gen):
        #if count%10 == 0:
            p = np.array([y.x,y.y,y.z,1])
            x.append(list(p[0:2]))
        #count = count + 1
    return x,color

def convertPC2ToXyz(ros_point_cloud,sensor_msg):
    # assert isinstance(ros_point_cloud[1], PointCloud2)
    #self.lock.acquire()
    gen = pc2.read_points(ros_point_cloud[1], skip_nans=True)

    x = []
    count = 0
    for y in list(gen):
        #if count%5 == 0:
            currentPose = get_tr_from_pose(sensor_msg.pose)

            p = np.dot(np.array([y[0],y[1],y[2],1]),currentPose.T).T
            x.append(list(p[0:2]))
        #count = count + 1
    return x

def create_image_zoomed(gt_data, index, dist_th=100):
    global currentSpeed
    try:
        d = gt_data[index]
        s = d["sensor_pose"]
        # xc = s["pose"]["position"][0]
        # yc = s["pose"]["position"][1]
        xc = s.pose.position.x
        yc = s.pose.position.y
        th = quaternion_to_rotation_matrix(np.array([s.pose.orientation.x,s.pose.orientation.y,s.pose.orientation.z,s.pose.orientation.w]))

        ### first transform the matrix to euler angles
        # r =  Rotation.from_matrix(th)
        # angles = r.as_euler("zyx",degrees=True)

        #### Modify the angles
        #print(angles)

        v = [s.twist.linear.x, s.twist.linear.y, s.twist.linear.z]
        speed = np.linalg.norm(np.array(v))
        currentSpeed = speed
        #currentAccel = s.accel.linear.x
        
        dist_th = 50 + 50 * (speed/17.9733)
        x0 = xc - dist_th
        y0 = yc - dist_th
        x1 = xc + dist_th
        y1 = yc + dist_th

        # ratio = (x1 - x0) / (y1 - y0)
        vw, vh = frame_size
        # if ratio > 1:
        #     vh = int(vw / ratio)
        # else:
        #     vw = int(vh * ratio)
        x_scale = vw / (x1 - x0)
        y_scale = vh / (y1 - y0)

        x_origin = 0
        y_origin = 0
        if x_scale < y_scale:
            scale = x_scale
            y_origin = 0.5 * (vh - scale * (y1 - y0))
        else:
            scale = y_scale
            x_origin = 0.5 * (vw - scale * (x1 - x0))

        def scale_x(x):
            return (x - x0) * scale+ x_origin

        def scale_y(y):
            return vh - (y - y0) * y_scale - y_origin

        def scale_xy(xy):
            return [scale_x(xy[0]), scale_y(xy[1])]
        
        def scale_xy_mod(xy):
            xyPose = np.array([scale_x(xy[0]), scale_y(xy[1])])
            xyOrigin = np.array([1080,540])
            xyPose = xyOrigin + np.dot(xyPose-xyOrigin,th[:2,:2].transpose())
            return xyPose

        image = np.zeros((vh, vw, 3), dtype=np.uint8)
        xform_fn = lambda xy: [int(c) for c in scale_xy(xy)]
        xform_fn_mod = lambda xy: [int(c) for c in scale_xy_mod(xy)]
        
        return image, xform_fn, xform_fn_mod,True
    except:
        vw, vh = frame_size
        image = np.zeros((vh, vw, 3), dtype=np.uint8)
        xform_fn = []
        return image,xform_fn,False

def draw_sensor_pos(f, image, gt_data, s_xy_int_orig, s_xy_int, color, outer_rings_spacing=25, num_outer_rings=10):
    origin = np.array([0, 0, 0, 1])
    msg = gt_data[f]
    #tr = get_tr_from_pose_msg(msg["sensor_pose"]["pose"])
    tr = get_tr_from_pose(msg["sensor_pose"].pose)
    p = np.dot(tr, origin.T).T
    xy = s_xy_int(p[0:2])
    # cv2.circle(image, xy, 10, color, -1)

    dimensions = np.array([4,2])
    half_dims = dimensions / 2
    corners = np.array([
        [-half_dims[0], -half_dims[1], 0],
        [-half_dims[0], half_dims[1], 0],
        [half_dims[0], half_dims[1], 0],
        [half_dims[0], -half_dims[1], 0],
    ])
    points_homogeneous = np.hstack((corners, np.ones((corners.shape[0], 1))))
    corners = np.dot(tr, points_homogeneous.T).T

    thickness = 2
    cv2.line(image, s_xy_int(corners[0]), s_xy_int(corners[1]), color, thickness)
    cv2.line(image, s_xy_int(corners[1]), s_xy_int(corners[2]), color, thickness)
    cv2.line(image, s_xy_int(corners[2]), s_xy_int(corners[3]), color, thickness)
    cv2.line(image, s_xy_int(corners[3]), s_xy_int(corners[0]), color, thickness)
    cv2.line(image, list(np.int_((np.array(s_xy_int(corners[1]))+np.array(s_xy_int(corners[2])))/2.)), list(np.int_((np.array(s_xy_int(corners[2]))+np.array(s_xy_int(corners[3])))/2.)), color, thickness)
    cv2.line(image, list(np.int_((np.array(s_xy_int(corners[2]))+np.array(s_xy_int(corners[3])))/2.)), list(np.int_((np.array(s_xy_int(corners[3]))+np.array(s_xy_int(corners[0])))/2.)), color, thickness)
    cv2.line(image, list(np.int_((np.array(s_xy_int(corners[3]))+np.array(s_xy_int(corners[0])))/2.)), list(np.int_((np.array(s_xy_int(corners[1]))+np.array(s_xy_int(corners[2])))/2.)), color, thickness)

    if num_outer_rings > 0:
        ring_color = (255,0,0, 35)
        ring_label_color = ((color[0] + 255) // 2, (color[1] + 255) // 2, (color[2] + 255) // 2)
        for i in range(num_outer_rings):
            corner = s_xy_int_orig((i + 1) * np.array([outer_rings_spacing, -outer_rings_spacing]) + p[0:2])
            radius = [corner[0] - xy[0], corner[1] - xy[1]]
            cv2.ellipse(image, xy, radius, 0, 0, 360, ring_color, 1)
            cv2.putText(image, f"{(i + 1) * outer_rings_spacing}", (corner[0], xy[1]), cv2.FONT_HERSHEY_SIMPLEX, 1,
                        ring_label_color, 2)


def draw_objects(f, image, data, s_xy_int, color, lead_id=None, ids=None):
    objs, _ = get_objects(f, data)
    for ann in objs:
        #if ids is not None and ann["object_id"] not in ids:
        #    continue

        #Do not draw unclassified objects
        if ann["classification"] == 0 or ann["classification"] == 1 or ann["classification"] == 2:
            continue

        #Set objects color to particular color
        if ann["classification"] == 3:  #Pedestrain -> green
            color = (0, 255,0)
        elif ann["classification"] == 4: #Bike -> yellow
            color = (0, 255,255)
        elif ann["classification"] == 5: #Car -> teal
            color = (0, 0, 255)
        elif ann["classification"] == 6: #Truck -> purple
            color = (255, 0, 255)
        
        if ann["object_id"] > 70000:
            color = (0, 0,100)
        xy = s_xy_int([ann["pose"]["position"][0], ann["pose"]["position"][1]])
        assert ann["shape_model"] == 0  # parallelepiped
        dimensions = np.array(ann["shape_parameters"])
        half_dims = dimensions / 2
        corners = np.array([
            [-half_dims[0], -half_dims[1], 0],
            [-half_dims[0], half_dims[1], 0],
            [half_dims[0], half_dims[1], 0],
            [half_dims[0], -half_dims[1], 0],
        ])
        tr = get_tr_from_pose_msg(ann["pose"])
        points_homogeneous = np.hstack((corners, np.ones((corners.shape[0], 1))))
        corners = np.dot(tr, points_homogeneous.T).T

        thickness = 2
        if not lead_id is None and ann["object_id"] == lead_id:
            thickness = 4

        cv2.line(image, s_xy_int(corners[0]), s_xy_int(corners[1]), color, thickness)
        cv2.line(image, s_xy_int(corners[1]), s_xy_int(corners[2]), color, thickness)
        cv2.line(image, s_xy_int(corners[2]), s_xy_int(corners[3]), color, thickness)
        cv2.line(image, s_xy_int(corners[3]), s_xy_int(corners[0]), color, thickness)


def get_objects(_f, gt_data, tr_data=None, gt_ids=None, tr_ids=None):
    _gt_objs, _tr_objs = None, None
    if not gt_data is None:
        _gt_objs = gt_data[_f]["objects"] if gt_ids is None \
            else [obj for obj in gt_data[_f]["objects"] if obj["object_id"] in gt_ids]
    if not tr_data is None:
        _tr_objs = tr_data[_f]["objects"] if tr_ids is None \
            else [obj for obj in tr_data[_f]["objects"] if obj["object_id"] in tr_ids]
    return _gt_objs, _tr_objs


def getLaneInfoFromDB(lane_id):
        
        cur.execute('SELECT * FROM public.mmlane_fy231101_fixed where laneid='+str(lane_id)+';')
        return cur.fetchall()

def draw_map_around_sensor(f,image, gt_data, s_xy_int, color,lanesDrawnList):
    try:
        svalue = 0
        currentLaneId = gt_data[f]['lane_ids']
        draw_lanes_around_sensor(f,image,currentLaneId,s_xy_int,color,svalue,lanesDrawnList, False)
    except:
        #print("Problem with db/map")
        return

def getXY(theta, translation, s_xy_int):
    # Construct the transformation matrix
    origin = np.array([0, 0, 0, 1])
    transformation_matrix = np.eye(4)
    rotation_matrix = np.array([
        [math.cos(theta), -math.sin(theta), 0],
        [math.sin(theta), math.cos(theta),  0],
        [   0,                  0,          1]
    ])
    transformation_matrix[:3, :3] = rotation_matrix
    transformation_matrix[:3, 3] = translation
    p = np.dot(transformation_matrix, origin.T).T
    return s_xy_int(p[0:2])

def draw_lanes_around_sensor(f,image,currentLaneId,s_xy_int,color,svalue,lanesDrawnList, isRecursive):        
        # print ("svalue: " + str(svalue))
        # print("current lane id: " + str(currentLaneId))
        # print("lanes drawn: ")
        # print(lanesDrawnList)
        rows = getLaneInfoFromDB(currentLaneId)
        # print("rows: ")
        # for i in range (2,7):
        #     print(rows[0][i])
        skipCurrentLaneDraw = False
        if currentLaneId in lanesDrawnList:
            skipCurrentLaneDraw = True

        if not skipCurrentLaneDraw:
            #Draw ego lane
            laneData = list(literal_eval(rows[0][1]))
            index = 0
            # and not(laneDrawn)
            while(index < len(laneData)):
                translation = np.array([laneData[index][0], laneData[index][1],0])
                xy = getXY(0, translation, s_xy_int)
                if index != 0:
                    cv2.line(image, prevxy, xy, (0,255,0), 1)
                prevxy = xy
                index = index + 1
            lanesDrawnList.append(currentLaneId)
            svalue = svalue + np.sqrt((laneData[len(laneData)-1][0] - laneData[0][0])*(laneData[len(laneData)-1][0] - laneData[0][0])+(laneData[len(laneData)-1][1] - laneData[0][1])*(laneData[len(laneData)-1][1] - laneData[0][1]))
            if(svalue > svalueCutOff):
                return
            # cv2.imshow('s',image)
            # cv2.waitKey(30)

        #Draw successor, predecessor, left-right siblings and opposite sibling lanes
        for i in range(2,7):
            listOfLanes = []
            if(',' in rows[0][i]):
                listOfLanes = list(literal_eval(rows[0][i]))
            else:
                if rows[0][i] == '':
                    continue
                l = int(rows[0][i])
                listOfLanes.append(l)
            for laneId in listOfLanes:
                rows_2 = getLaneInfoFromDB(laneId)
                if laneId in lanesDrawnList:
                    continue
                laneData_2 = list(literal_eval(rows_2[0][1]))
                #Draw ego lane
                index_2 = 0
                # and not(laneDrawn_2)
                while(index_2 < len(laneData_2) ):                    
                    translation_2 = np.array([laneData_2[index_2][0], laneData_2[index_2][1],0])
                    xy_2 = getXY(laneData_2[index_2][2], translation_2, s_xy_int)
                    if index_2 != 0:
                        cv2.line(image, prevxy_2, xy_2, (0,255,0), 1)
                    prevxy_2 = xy_2
                    index_2 = index_2 + 1
                lanesDrawnList.append(laneId)
                svalue = svalue + np.sqrt((laneData_2[len(laneData_2)-1][0] - laneData_2[0][0])*(laneData_2[len(laneData_2)-1][0] - laneData_2[0][0])+(laneData_2[len(laneData_2)-1][1] - laneData_2[0][1])*(laneData_2[len(laneData_2)-1][1] - laneData_2[0][1]))
                if(svalue > svalueCutOff):
                    return
                if not isRecursive:
                    draw_lanes_around_sensor(f,image,laneId,s_xy_int,color,svalue,lanesDrawnList, True)
        
                

            # cv2.imshow('s',image)
            # cv2.waitKey(30)
        
        # successorList = []
        # siblingList = []
        # if(',' in rows[0][3]):
        #     successorList = list(literal_eval(rows[0][3]))
        # else:
        #     successorList.append(int(rows[0][3]))

        # for i in successorList:
        #     if i != '':
                
        # if(',' in rows[0][6]):
        #     siblingList = list(literal_eval(rows[0][6]))
        # else:
        #     siblingList.append(int(rows[0][6]))
        # for i in siblingList:
        #     if i != '':
        #         draw_lanes_around_sensor(f,image,i,s_xy_int,color,svalue,lanesDrawnList, True)



def get_drivable_area_points(_f, gt_data, tr_data=None, gt_ids=None, tr_ids=None):
    _gt_objs, _tr_objs, useObj = None, None, False
    try:
        if not gt_data is None:
            _gt_objs = gt_data[_f]["drivable_area"] if gt_ids is None \
                else [obj for obj in gt_data[_f]["objects"] if obj["object_id"] in gt_ids]
        useObj = True
    except:
        print("Something wrong")
        useObj = False
    return _gt_objs, _tr_objs, useObj

def get_desired_path_points(_f, gt_data, tr_data=None, gt_ids=None, tr_ids=None):
    _gt_objs, _tr_objs, useObj = None, None, False
    try:
        if not gt_data is None:
            _gt_objs = gt_data[_f]["desired_path"] if gt_ids is None \
                else [obj for obj in gt_data[_f]["objects"] if obj["object_id"] in gt_ids]
        useObj = True
    except:
        print("Something wrong")
        useObj = False
    return _gt_objs, _tr_objs, useObj

def get_tr_from_pose_drivable_area(x,y):
    """
    Construct a transformation matrix from a pose.
    :param pose: NRC pose structure with position and orientation fields
    :return: 4x4 transform
    """
    position = np.array([x,y,0])
    orientation = np.array([0,0,0,1])
    return get_transformation_matrix(position, orientation)

def draw_drivable_area(f, image, data, s_xy_int, color, lead_id=None, ids=None):
    origin = np.array([0, 0, 0, 1])
    objs, _, useObj = get_drivable_area_points(f, data)
    if(useObj):
        for ann in objs:
            tr = get_tr_from_pose_drivable_area(ann[0],ann[1])
            p = np.dot(tr, origin.T).T
            xy = s_xy_int(p[0:2])
            cv2.circle(image, xy, radius=1, color=(255, 255, 255), thickness=-1)

def draw_desired_path(f, image, data, s_xy_int, color, lead_id=None, ids=None):
    origin = np.array([0, 0, 0, 1])
    objs, _, useObj = get_desired_path_points(f, data)
    if(useObj):
        for pose,colorPointVal in zip(objs[0],objs[1]):
            tr = get_tr_from_pose_drivable_area(pose[0],pose[1])
            p = np.dot(tr, origin.T).T
            xy = s_xy_int(p[0:2])
            pointColor = (0,0,0)
            if colorPointVal == 0.:
                pointColor = (0,0,255)
            elif colorPointVal == 5.:
                pointColor = (0,255,0)
            elif colorPointVal == 10.:
                pointColor = (255,0,255)
            cv2.circle(image, xy, radius=1, color=pointColor, thickness=-1)

def draw_auto_goals(f, image, data, s_xy_int, color, lead_id=None, ids=None):
    origin = np.array([0, 0, 0, 1])
    objs = data[f]["auto_goals"]
    for marker in objs.markers:
        pointColor = (marker.color.b*255,marker.color.g*255,marker.color.r*255)
        if marker.ns == "Lane Priority Status":
            for point in list(marker.points):
                tr = get_tr_from_pose_drivable_area(point.x,point.y)
                p = np.dot(tr, origin.T).T
                xy = s_xy_int(p[0:2])
                cv2.circle(image, xy, radius=1, color=pointColor, thickness=-1)
        elif marker.ns == "Boundary":
            corner_0 = (marker.points[0].x,marker.points[0].y,0)
            corner_1 = (marker.points[1].x,marker.points[1].y,0)
            cv2.line(image, s_xy_int(corner_0), s_xy_int(corner_1), color=pointColor)
        elif marker.ns == "Monitor Zones":
            corner_0 = (marker.points[0].x,marker.points[0].y,0)
            corner_1 = (marker.points[1].x,marker.points[1].y,0)
            corner_2 = (marker.points[2].x,marker.points[2].y,0)
            corner_3 = (marker.points[3].x,marker.points[3].y,0)
            cv2.line(image, s_xy_int(corner_0), s_xy_int(corner_1), color=pointColor)
            cv2.line(image, s_xy_int(corner_1), s_xy_int(corner_2), color=pointColor)
            cv2.line(image, s_xy_int(corner_2), s_xy_int(corner_3), color=pointColor)
            cv2.line(image, s_xy_int(corner_3), s_xy_int(corner_0), color=pointColor)
            #cv2.circle(image, xy, radius=1, color=pointColor, thickness=-1)

def draw_predictions(f, image, data, s_xy_int, color, lead_id=None, ids=None):
    origin = np.array([0, 0, 0, 1])
    msg = data[f]['predictions']
    map_prediction_exists = False
    for trajectories in msg.trajectories:
        prevPoint = [0,0]
        is_kinematic_prediction = np.int_(trajectories.trajectory_name.split('_')[1])
        if is_kinematic_prediction > 0:
            for trajectory in trajectories.trajectory:
                #tr = get_tr_from_pose_msg(trajectory)
                if not map_prediction_exists:
                    map_prediction_exists = True
                p = [trajectory.x , trajectory.y,0]
                xy = s_xy_int(p[0:2])
                if prevPoint[0] == 0 and prevPoint[1] == 0:
                    prevPoint = xy
                else:
                    #cv2.circle(image, xy, 1, color, -1)
                    thickness = 2
                    cv2.line(image, prevPoint, xy, color, thickness)
                    prevPoint = xy
    
    #If there are no map predictions, draw only kinematic predictions
    if not map_prediction_exists:
        for trajectories in msg.trajectories:
            prevPoint = [0,0]
            for trajectory in trajectories.trajectory:
                p = [trajectory.x , trajectory.y,0]
                xy = s_xy_int(p[0:2])
                if prevPoint[0] == 0 and prevPoint[1] == 0:
                    prevPoint = xy
                else:
                    #cv2.circle(image, xy, 1, color, -1)
                    thickness = 2
                    cv2.line(image, prevPoint, xy, color, thickness)
                    prevPoint = xy



def draw_hazard_zone(f, image, data, s_xy_int, color, lead_id=None, ids=None):
    origin = np.array([0, 0, 0, 1])
    objs = data[f]["hazard_zone"]
    rectangleSizeX = int((5/3840)*frame_size[0])
    rectangleSizeY = int((10/2160)*frame_size[1])
    counter = 0
    for marker in objs.markers:
        if counter%2 == 0:
            tr = get_tr_from_pose_drivable_area(marker.pose.position.x,marker.pose.position.y)
            p = np.dot(tr, origin.T).T
            xy = s_xy_int(p[0:2])
            cv2.rectangle(image, (xy[0]-rectangleSizeX, xy[1]-rectangleSizeY), (xy[0]+rectangleSizeX,xy[1]+rectangleSizeY), color=(100,100,0), thickness=-1)
        counter = counter + 1
        #cv2.circle(overlay, xy, radius=1, color=pointColor, thickness=-1)

def draw_front_camera(f,frame,camera_messages):
    global currentSpeed
    global currentAccel
    # Add camera frame to current frame
    if f < len(camera_messages):
        np_arr = np.frombuffer(camera_messages[f].data, np.uint8)
        image_np = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # calculate the ratio of the width and construct the dimensions
        (h, w) = image_np.shape[:2]
        width = widthOfCameraFeed
        r = width / float(w)
        dim = (int(width), int(h * r))

        # resize the image
        image_np = cv2.resize(image_np, dim, interpolation = cv2.INTER_AREA)
        #image_np = cv2.resize(image_np,(reSizeX,reSizeY))
        # cv2.imshow('w',image_np)
        # cv2.waitKey(30)

        x_offset=offsetOfCameraFeed
        y_offset=offsetOfCameraFeed+20
        frame[y_offset:y_offset+image_np.shape[0], x_offset:x_offset+image_np.shape[1]] = image_np

def draw_speed_on_front_camera_image(f,frame):
    #Add speed of the vehicle to image
    font = cv2.FONT_HERSHEY_SIMPLEX
    org = ([offsetOfCameraFeed+widthOfCameraFeed-230,offsetOfCameraFeed+50])
    fontScale = 0.7
    thickness = 2

    color = (0,255,255)
    cv2.putText(frame,"SpdAct:"+str(round(currentSpeed,1)) + " m/s", org, font, fontScale, color, thickness, cv2.LINE_AA)
    #org[1] = org[1]+30
    #cv2.putText(frame, str(round(currentAccel,1)) + "m/s\u00B2", org, font, fontScale, color, thickness, cv2.LINE_AA)

def draw_accel_on_front_camera_image(f,frame, data):
    global currentAccel
    control_input_data = data[f]["control_inputs"]
    currentAccel = round((control_input_data.accelerometer)/2000.,2)
    #Add accel of the vehicle to image
    font = cv2.FONT_HERSHEY_SIMPLEX
    org = ([offsetOfCameraFeed+widthOfCameraFeed-230,offsetOfCameraFeed+50])
    fontScale = 0.7
    thickness = 2

    color = (0,255,255)
    #cv2.putText(frame, str(round(currentSpeed,1)) + "m/s", org, font, fontScale, color, thickness, cv2.LINE_AA)
    org[1] = org[1]+30
    cv2.putText(frame,"AccReq:" + str(round(currentAccel,1)) + " m/s2", org, font, fontScale, color, thickness, cv2.LINE_AA)

def draw_traffic_light(f,frame,tfl_messages):
    # Add tfl frame to current frame
    x_offset = y_offset = offsetOfCameraFeed
    cwd = os.getcwd()
    if f < len(tfl_messages):
        image_np_tfl_straight = cv2.imread(cwd+"/images/tfl_empty.png", cv2.IMREAD_COLOR)
        image_np_tfl_left = cv2.imread(cwd+"/images/tfl_empty.png", cv2.IMREAD_COLOR)
        # channelDivider = 5.
        # a_channel_straight = np.ones(image_np_tfl_straight.shape, dtype=float)/channelDivider
        # a_channel_left = np.ones(image_np_tfl_left.shape, dtype=float)/channelDivider
        # image_np_tfl_straight = image_np_tfl_straight*a_channel_straight
        # image_np_tfl_left = image_np_tfl_left*a_channel_left
        
        if tfl_messages[f].data[0] == 1:
            image_np_tfl_left = cv2.imread(cwd+"/images/tfl_cropped_red_left.png", cv2.IMREAD_COLOR)

        if tfl_messages[f].data[0] == 3:
            image_np_tfl_left = cv2.imread(cwd+"/images/tfl_cropped_green_left.png", cv2.IMREAD_COLOR)

        if tfl_messages[f].data[1] == 1:
            image_np_tfl_straight = cv2.imread(cwd+"/images/tfl_cropped_red.png", cv2.IMREAD_COLOR)

        if tfl_messages[f].data[1] == 3:
            image_np_tfl_straight = cv2.imread(cwd+"/images/tfl_cropped_green.png", cv2.IMREAD_COLOR)

        # calculate the ratio of the width and construct the dimensions
        (h, w_s) = image_np_tfl_left.shape[:2]
        height = frame_size[0]/9
        r_s = height / float(h)
        dim = (int(w_s * r_s), int(height))

        # resize the image
        image_np_tfl_left = cv2.resize(image_np_tfl_left, dim, interpolation = cv2.INTER_AREA)

        x_offset= offsetOfCameraFeed + widthOfCameraFeed
        frame[y_offset:y_offset+image_np_tfl_left.shape[0], x_offset:x_offset+image_np_tfl_left.shape[1]] = image_np_tfl_left

        # calculate the ratio of the width and construct the dimensions
        (h, w) = image_np_tfl_straight.shape[:2]
        height = frame_size[0]/9
        r = height / float(h)
        dim = (int(w * r), int(height))

        # resize the image
        image_np_tfl_straight = cv2.resize(image_np_tfl_straight, dim, interpolation = cv2.INTER_AREA)

        x_offset= offsetOfCameraFeed + widthOfCameraFeed + int(w_s * r_s)
        frame[y_offset:y_offset+image_np_tfl_straight.shape[0], x_offset:x_offset+image_np_tfl_straight.shape[1]] = image_np_tfl_straight

def draw_override_text(f, image, data, s_xy_int, color, lead_id=None, ids=None):
    #print("Driver_input")
    font = cv2.FONT_HERSHEY_SIMPLEX 

    # org 
    org = (int(frame_size[0]/2),offsetOfCameraFeed)
    
    # fontScale 
    fontScale = 1
    
    # Blue color in BGR 
    color = (255, 255, 255) 
    
    # Line thickness of 2 px 
    thickness = 2
    ctrl_state_flg_msg = data[f]['CtrlStateFLG']

    cwd = os.getcwd()
    image_np_propilot = cv2.imread(cwd+"/images/propilot.png", cv2.IMREAD_COLOR)
    image_np_brake = cv2.imread(cwd+"/images/brake_off.png", cv2.IMREAD_COLOR)
    image_np_accel = cv2.imread(cwd+"/images/accel_off.png", cv2.IMREAD_COLOR)

    # Make images faded
    channelDivider = 7.
    a_channel_propilot = np.ones(image_np_propilot.shape, dtype=float)/channelDivider
    a_channel_brake = np.ones(image_np_brake.shape, dtype=float)/channelDivider
    a_channel_accel = np.ones(image_np_accel.shape, dtype=float)/channelDivider
    image_np_accel = image_np_accel*a_channel_accel
    image_np_brake = image_np_brake*a_channel_brake

    useImageInsteadofText = True
    # AV engaged
    if ctrl_state_flg_msg.Engaged:
        #Accel override
        if ctrl_state_flg_msg.ACC:
            if not useImageInsteadofText:
                color = (0,255,255)
                image = cv2.putText(image, 'AV engaged, accelerator override', org, font, fontScale, color, thickness, cv2.LINE_AA)
            else:
                image_np_accel = cv2.imread(cwd+"/images/accel_on.png", cv2.IMREAD_COLOR)

        #Brake override
        elif ctrl_state_flg_msg.BRK_Override:
            if not useImageInsteadofText:
                color = (0,255,255)
                image = cv2.putText(image, 'AV engaged, brake override', org, font, fontScale, color, thickness, cv2.LINE_AA)
            else:
                image_np_brake = cv2.imread(cwd+"/images/brake_on.png", cv2.IMREAD_COLOR)
        
        else:
            if not useImageInsteadofText:
                color = (255,0,0)
                image = cv2.putText(image, 'AV engaged', org, font, fontScale, color, thickness, cv2.LINE_AA)
    
    #AV disengaged
    else:
        if not useImageInsteadofText:
            color = (0,0,255)
            image = cv2.putText(image, 'AV disengaged', org, font, fontScale, color, thickness, cv2.LINE_AA)
        else:
            image_np_propilot = image_np_propilot*a_channel_propilot
    

    # calculate the ratio of the width and construct the dimensions
    heightDivider = 20
    x_offset = y_offset = offsetOfCameraFeed
    x_offset = x_offset + widthOfCameraFeed + 2*tflImageWidth
    (h, w) = image_np_propilot.shape[:2]
    height = frame_size[0]/heightDivider
    r = height / float(h)
    dim = (int(w * r), int(height))

    # resize the image
    image_np_propilot = cv2.resize(image_np_propilot, dim, interpolation = cv2.INTER_AREA)
    image[y_offset:y_offset+image_np_propilot.shape[0], x_offset:x_offset+image_np_propilot.shape[1]] = image_np_propilot
    
    # calculate the ratio of the width and construct the dimensions
    #x_offset = x_offset + int(w * r)
    y_offset = y_offset + int(height)
    (h_brake, w_brake) = image_np_brake.shape[:2]
    height_brake = frame_size[0]/heightDivider
    r_brake = height_brake / float(h_brake)
    dim_brake = (int(w_brake * r_brake), int(height_brake))

    # resize the image
    image_np_brake = cv2.resize(image_np_brake, dim_brake, interpolation = cv2.INTER_AREA)
    image[y_offset:y_offset+image_np_brake.shape[0], x_offset:x_offset+image_np_brake.shape[1]] = image_np_brake

    # calculate the ratio of the width and construct the dimensions
    x_offset = x_offset + int(w_brake * r_brake)
    (h_accel, w_accel) = image_np_accel.shape[:2]
    height_accel = frame_size[0]/heightDivider
    r_accel = height_accel / float(h_accel)
    dim_accel = (int(w_accel * r_accel), int(height_accel))

    # resize the image
    image_np_accel = cv2.resize(image_np_accel, dim_accel, interpolation = cv2.INTER_AREA)
    image[y_offset:y_offset+image_np_accel.shape[0], x_offset:x_offset+image_np_accel.shape[1]] = image_np_accel

    # orgSpd = (int(frame_size[0]/2),int(frame_size[1] - offsetOfCameraFeed))
    # vehSpd = "{:.2f}".format(ctrl_state_flg_msg.VehicleSpeed_kmh/3.6)
    # color = (255,255,255)
    # image = cv2.putText(image, "AV speed: "+ vehSpd +" m/s", orgSpd, font, fontScale, color, thickness, cv2.LINE_AA)
    #driver_input_messages[f].data[0]
    # cv2.putText(frame, f"{(i + 1) * outer_rings_spacing}", (corner[0], xy[1]), cv2.FONT_HERSHEY_SIMPLEX, 1,
    #                     ring_label_color, 2)

def draw_override_text_ariya(f, image, data, s_xy_int, color, lead_id=None, ids=None):
    #print("Driver_input")
    font = cv2.FONT_HERSHEY_SIMPLEX 

    # org 
    org = (int(frame_size[0]/2),offsetOfCameraFeed)
    
    # fontScale 
    fontScale = 1
    
    # Blue color in BGR 
    color = (255, 255, 255) 
    
    # Line thickness of 2 px 
    thickness = 2
    driver_input_msg = data[f]['driver_input']

    cwd = os.getcwd()
    image_np_propilot = cv2.imread(cwd+"/images/propilot.png", cv2.IMREAD_COLOR)
    image_np_brake = cv2.imread(cwd+"/images/brake_off.png", cv2.IMREAD_COLOR)
    image_np_accel = cv2.imread(cwd+"/images/accel_off.png", cv2.IMREAD_COLOR)

    # Make images faded
    channelDivider = 7.
    a_channel_propilot = np.ones(image_np_propilot.shape, dtype=float)/channelDivider
    a_channel_brake = np.ones(image_np_brake.shape, dtype=float)/channelDivider
    a_channel_accel = np.ones(image_np_accel.shape, dtype=float)/channelDivider
    image_np_accel = image_np_accel*a_channel_accel
    image_np_brake = image_np_brake*a_channel_brake

    useImageInsteadofText = True
    # AV engaged
    # if ctrl_state_flg_msg.Engaged:
    #Accel override
    if driver_input_msg.is_driver_accel:
        if not useImageInsteadofText:
            color = (0,255,255)
            image = cv2.putText(image, 'AV engaged, accelerator override', org, font, fontScale, color, thickness, cv2.LINE_AA)
        else:
            image_np_accel = cv2.imread(cwd+"/images/accel_on.png", cv2.IMREAD_COLOR)

    #Brake override
    elif driver_input_msg.is_driver_brake:
        if not useImageInsteadofText:
            color = (0,255,255)
            image = cv2.putText(image, 'AV engaged, brake override', org, font, fontScale, color, thickness, cv2.LINE_AA)
        else:
            image_np_brake = cv2.imread(cwd+"/images/brake_on.png", cv2.IMREAD_COLOR)
    
    else:
        if not useImageInsteadofText:
            color = (255,0,0)
            image = cv2.putText(image, 'AV engaged', org, font, fontScale, color, thickness, cv2.LINE_AA)
    
    # #AV disengaged
    # else:
    #     if not useImageInsteadofText:
    #         color = (0,0,255)
    #         image = cv2.putText(image, 'AV disengaged', org, font, fontScale, color, thickness, cv2.LINE_AA)
    #     else:
    #         image_np_propilot = image_np_propilot*a_channel_propilot
    

    # calculate the ratio of the width and construct the dimensions
    heightDivider = 20
    x_offset = y_offset = offsetOfCameraFeed
    x_offset = x_offset + widthOfCameraFeed + 2*tflImageWidth
    (h, w) = image_np_propilot.shape[:2]
    height = frame_size[0]/heightDivider
    r = height / float(h)
    dim = (int(w * r), int(height))

    # resize the image
    image_np_propilot = cv2.resize(image_np_propilot, dim, interpolation = cv2.INTER_AREA)
    image[y_offset:y_offset+image_np_propilot.shape[0], x_offset:x_offset+image_np_propilot.shape[1]] = image_np_propilot
    
    # calculate the ratio of the width and construct the dimensions
    #x_offset = x_offset + int(w * r)
    y_offset = y_offset + int(height)
    (h_brake, w_brake) = image_np_brake.shape[:2]
    height_brake = frame_size[0]/heightDivider
    r_brake = height_brake / float(h_brake)
    dim_brake = (int(w_brake * r_brake), int(height_brake))

    # resize the image
    image_np_brake = cv2.resize(image_np_brake, dim_brake, interpolation = cv2.INTER_AREA)
    image[y_offset:y_offset+image_np_brake.shape[0], x_offset:x_offset+image_np_brake.shape[1]] = image_np_brake

    # calculate the ratio of the width and construct the dimensions
    x_offset = x_offset + int(w_brake * r_brake)
    (h_accel, w_accel) = image_np_accel.shape[:2]
    height_accel = frame_size[0]/heightDivider
    r_accel = height_accel / float(h_accel)
    dim_accel = (int(w_accel * r_accel), int(height_accel))

    # resize the image
    image_np_accel = cv2.resize(image_np_accel, dim_accel, interpolation = cv2.INTER_AREA)
    image[y_offset:y_offset+image_np_accel.shape[0], x_offset:x_offset+image_np_accel.shape[1]] = image_np_accel

    # orgSpd = (int(frame_size[0]/2),int(frame_size[1] - offsetOfCameraFeed))
    # vehSpd = "{:.2f}".format(ctrl_state_flg_msg.VehicleSpeed_kmh/3.6)
    # color = (255,255,255)
    # image = cv2.putText(image, "AV speed: "+ vehSpd +" m/s", orgSpd, font, fontScale, color, thickness, cv2.LINE_AA)
    #driver_input_messages[f].data[0]
    # cv2.putText(frame, f"{(i + 1) * outer_rings_spacing}", (corner[0], xy[1]), cv2.FONT_HERSHEY_SIMPLEX, 1,
    #                     ring_label_color, 2)

            
def create_video(input_json_tr, camera_messages,tfl_messages, output_fname, second_csv=None, second_json=None,
                 max_interval=-1, t2c_adjustment=1.2, frame_margin=10, default_dist=300):
    
    #Load map
    # map_data = pd.read_csv("~/outCenter.csv")
    # coord = pd.DataFrame(map_data, columns=['x','y'])
    # coordlist = coord.values.tolist()

    # with open(input_json_tr) as jsonfile:
    #     tr_data = json.load(jsonfile)
    tr_data = input_json_tr

    tr_data2 = None
    if second_json:
        with open(second_json) as jsonfile:
            tr_data2 = json.load(jsonfile)

    # gt_ids and tr_ids are dictionary with keys being the ids of the lead vehicles
    # GT and tracked respectively and values being lists of time intervals when the
    # vehicle with corresponding id is the lead
    #gt_ids = {}
    
    out = cv2.VideoWriter(output_fname, fourcc, fps, frame_size)
    if not out.isOpened():
        print(f"Error opening video stream or file")
        return
    gt2tr = defaultdict(list)
    #dist_tresholds = compute_dist_thresholds(gt_data, df, t2c_threshold=max_t2c, t2c_adjustment=t2c_adjustment,
    #                                         margin=frame_margin, default_dist=default_dist)
    

    for f in tqdm(range(len(tr_data))):

        image,s_xy_int_orig, s_xy_int,useImage = create_image_zoomed(tr_data, f)

        if not useImage:
            continue
        #draw_map(image,tr_data, s_xy_int, (0, 255, 0),map_data,coordlist)
        #draw_trajectories(gt_data, (0, 255, 0), image, s_xy_int, ids=gt_ids)
        #draw_trajectories(tr_data, (0, 0, 255), image, s_xy_int, ids=tr_ids, max_interval=max_interval)
        #draw_sensor_trajectory(image, tr_data, s_xy_int, (255, 0, 0))

        frame = np.copy(image)

        # Draw sensor pose
        if 'sensor_pose' in tr_data[f]:
            draw_sensor_pos(f, frame, tr_data, s_xy_int_orig, s_xy_int, (255, 255, 255))
        # lead_t2c = df.iloc[f].at["gt_t2c"]
        # lead_gt_id = None
        # if lead_t2c <= max_t2c:
        #     lead_gt_id = df.iloc[f].at["gt_id"]
        #     lead_gt_id = int(lead_gt_id) if not np.isnan(lead_gt_id) else None
            
        # Draw wm objects pose
        if 'objects' in tr_data[f]:
            draw_objects(f, frame, tr_data, s_xy_int, (0, 255, 0))

        lanesDrawnList = []
        # Draw map around sensor
        if 'sensor_pose' in tr_data[f] and connectDB:
            draw_map_around_sensor(f,frame, tr_data, s_xy_int, (0, 255, 0),lanesDrawnList)
        

        # Draw drivable area
        if 'drivable_area' in tr_data[f]:
            draw_drivable_area(f, frame, tr_data, s_xy_int, (255, 255, 255))
        
        # Draw desired path
        if 'desired_path' in tr_data[f]:
            draw_desired_path(f, frame, tr_data, s_xy_int, (255, 255, 255))

        # Draw intersection prediction and auto goals display
        if 'auto_goals' in tr_data[f]:
            draw_auto_goals(f, frame, tr_data, s_xy_int, (255, 255, 255))
        
        # Draw predictions
        if 'predictions' in tr_data[f]:
            draw_predictions(f,frame, tr_data, s_xy_int, (230-50, 216-50, 173-50))
        
        # Draw hazard zone
        if 'hazard_zone' in tr_data[f]:
            draw_hazard_zone(f, frame, tr_data, s_xy_int, (255, 255, 255))
        
        # Add front camera frame
        if len(camera_messages):
            draw_front_camera(f,frame,camera_messages)
        
        # Add speed to front camera frame
        draw_speed_on_front_camera_image(f,frame)
        
        # Add accel to front camera frame
        if 'control_inputs' in tr_data[f]:
            draw_accel_on_front_camera_image(f,frame, tr_data)
        
        if 'tfl' in tr_data[f]:
            draw_traffic_light(f,frame,tfl_messages)
        
        if 'CtrlStateFLG' in tr_data[f]:
            draw_override_text(f,frame,tr_data,s_xy_int, (255, 255, 255))
        
        if 'driver_input' in tr_data[f] and 'AV_MIKE' in output_fname:
            draw_override_text_ariya(f,frame,tr_data,s_xy_int, (255, 255, 255))

        out.write(frame)
        # cv2.imshow('s',frame)
        # cv2.waitKey(30)
    out.release()

def process_directory(bags_dir: Path, args):
####################################        
#    print ("Just printing the bags_dir, ", bags_dir)
####################################    
    if bags_dir.is_dir():
        bags_base_name = str(bags_dir.name)
        print(f"processing {bags_base_name}")
        # gt_bag_fn = bags_dir / Path(args.gt_bag_prefix + bags_base_name + '.bag')
        # if not gt_bag_fn.exists():
        #     print(f"{gt_bag_fn} does not exists")
        #     return
        track_bag_fn = bags_dir / Path(args.track_bag_prefix + bags_base_name + '.bag')
        if not track_bag_fn.exists():
            #print(f"{track_bag_fn} does not exists")
            return
        raw_bag_fn = bags_dir / Path(args.raw_bag_prefix + bags_base_name + '.bag')
        if not raw_bag_fn.exists():
            #print(f"{raw_bag_fn} does not exists")
            return
        print(F"processing bag files at {args.bags_dir}")
    else:
        # gt_bag_fn = bags_dir
        # if not gt_bag_fn.exists():
        #     print(f"{gt_bag_fn} does not exists")
        #     return
        if not bags_dir.is_file() or not bags_dir.suffix == '.bag':
            return
        track_bag_fn = bags_dir
        raw_bag_fn = bags_dir

        print(F"processing bag file {bags_dir}")
        bags_base_name = bags_dir.with_suffix("").name
        bags_base_name = bags_base_name.replace("pcp_result_", "")

        bags_dir = bags_dir.parent

    # check if video file already exists
    #output_fname = str(bags_dir)+"/"+snap_folder_name+"/"+bags_base_name+".mp4"  ##############Original Code######################
    output_fname = str(args.output_directory)+"/"+snap_folder_name+"/"+bags_base_name+".mp4"
    if os.path.exists(output_fname):
        return 2
    # read tracker data
    with rosbag.Bag(str(track_bag_fn)) as bag:
        # topics = [topic for (topic, _) in bag.get_type_and_topic_info().topics.items()]
        # if args.track_topic not in topics:
        #     print(f"topic {args.track_topic} not present at {track_bag_fn}")
        #     print(f"If you want one of {topics}, use --gt_topic <name>")
        #     return
        tr_data = list(bag.read_messages(args.track_topic))
    if not tr_data:
        print("No tracks data, stopping video produciton")
        return -1
    
    tr_json_content = [{"t": _time.to_sec(),
                "objects": [obj2dict(obj) for obj in _data.objects]}
                for _topic, _data, _time in tr_data]
        
    print ("Done processing tracking data with size: " + str(len(tr_data)))

    # read sensor pose data
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        sensor_pose_data = list(bag.read_messages(args.sensor_pose_topic))

    if not sensor_pose_data:
        with rosbag.Bag(str(raw_bag_fn)) as bag:
            sensor_pose_data = list(bag.read_messages("/gps_state/dynamic_global_pose_oxts"))

    if not sensor_pose_data:
        print("No pose data, stopping video produciton")
        return -1
    
    _, _, sensor_start_frame, _ = align_data(tr_data, sensor_pose_data)
    sensor_pose_data = sensor_pose_data[sensor_start_frame:]
    sensor_frame_interval = np.round((sensor_pose_data[-1][2].to_sec() - sensor_pose_data[0][2].to_sec()) /
                                     (len(sensor_pose_data) - 1), 5)
    tr_start_time = tr_data[0][2].to_sec()
    sensor_frames = [int(round((tr[2].to_sec() - tr_start_time) / sensor_frame_interval, 0)) for tr in tr_data]

    # print("start time: ")
    # print(tr_start_time)
    # print("interval: ")
    # print(sensor_frame_interval)
    # for tr in tr_data:
    #     frame = int(round((tr[2].to_sec() - tr_start_time) / sensor_frame_interval, 0))
    #     print(tr[2].to_sec())
    #     print((tr[2].to_sec() - tr_start_time) / sensor_frame_interval)
    sensor_msgs = [msg for (_, msg, t) in [sensor_pose_data[f] for f in sensor_frames if f < len(sensor_pose_data)]]

    for f, s in zip(tr_json_content, sensor_msgs):
        #f["sensor_pose"] = obj2dict(s)
        f["sensor_pose"] = s

    print("Done processing sensor data with size: "+ str(len(sensor_msgs)))

    # read lane id data
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        lane_id_data = list(bag.read_messages(args.lane_id_topic))

    if not lane_id_data:
        print("No lane id data, ... continuing")
    else:
        _, _, lane_id_start_frame, _ = align_data(tr_data, lane_id_data)
        lane_id_data = lane_id_data[lane_id_start_frame:]
        lane_id_interval = np.round((lane_id_data[-1][2].to_sec() - lane_id_data[0][2].to_sec()) /
                                        (len(lane_id_data) - 1), 5)
        lane_id_frames = [int(round((tr[2].to_sec() - tr_start_time) / lane_id_interval, 0)) for tr in tr_data]
        lane_id_msgs = [msg for msg in [lane_id_data[f][1].drive_goals[0].lane_id for f in lane_id_frames if f < len(lane_id_data)]]
        
        for f, s in zip(tr_json_content, lane_id_msgs):
            f["lane_ids"] = s
        print("Done processing lane id data with size: " + str(len(lane_id_msgs)))

    # read drivable area data
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        drivable_area_data = list(bag.read_messages(args.drivable_area_topic))

    if not drivable_area_data:
        print("No drivable area data, ... continuing")
    else:
        print("Processing drivable area data .......")
        _, _, drivable_area_start_frame, _ = align_data(tr_data, drivable_area_data)
        drivable_area_data = drivable_area_data[drivable_area_start_frame:]
        drivable_area_interval = np.round((drivable_area_data[-1][2].to_sec() - drivable_area_data[0][2].to_sec()) /
                                        (len(drivable_area_data) - 1), 5)
        drivable_area_frames = [int(round((tr[2].to_sec() - tr_start_time) / drivable_area_interval, 0)) for tr in tr_data]
        drivable_area_msgs = [msg for msg in 
                            [convertPC2ToXyz(drivable_area_data[f],sensor_msgs[f]) 
                            for f in drivable_area_frames 
                            if f < min(len(drivable_area_data),len(sensor_msgs))]]

        for f, s in zip(tr_json_content, drivable_area_msgs):
            f["drivable_area"] = s

        print("Done processing drivable area data with size: " + str(len(drivable_area_msgs)))
    
    # read lane planner desired path
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        desired_path_data = list(bag.read_messages(args.lane_planner_desired_path))

    if not desired_path_data:
        print("No lane id data, ... continuing")
    else:
        _, _, desired_path_start_frame, _ = align_data(tr_data, desired_path_data)
        desired_path_data = desired_path_data[desired_path_start_frame:]
        desired_path_interval = np.round((desired_path_data[-1][2].to_sec() - desired_path_data[0][2].to_sec()) /
                                        (len(desired_path_data) - 1), 5)
        desired_path_frames = [int(round((tr[2].to_sec() - tr_start_time) / desired_path_interval, 0)) for tr in tr_data]
        desired_path_msgs = [msg for msg in 
                            [convertPCToXyz(desired_path_data[f]) 
                            for f in desired_path_frames 
                            if f < min(len(desired_path_data),len(sensor_msgs))]]
        
        for f, s in zip(tr_json_content, desired_path_msgs):
            f["desired_path"] = s
        print("Done processing desired path data with size: " + str(len(desired_path_msgs)))

    # read camera data
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        camera_data = list(bag.read_messages(args.camera_topic))
    camera_msgs = []

    if not camera_data:
        with rosbag.Bag(str(raw_bag_fn)) as bag:
            camera_data = list(bag.read_messages("/tower_cam_front/image_stamped/compressed"))
        
    if not camera_data:
        print("No camera data, ... continuing")
    else:
        try:
            _, _, camera_start_frame, _ = align_data(tr_data, camera_data)
            camera_data = camera_data[camera_start_frame:]
            camera_interval = np.round((camera_data[-1][2].to_sec() - camera_data[0][2].to_sec()) /
                                            (len(camera_data) - 1), 5)
            camera_frames = [int(round((tr[2].to_sec() - tr_start_time) / camera_interval, 0)) for tr in tr_data]

            camera_msgs = [msg for msg in 
                                [camera_data[f].message
                                for f in camera_frames 
                                if f < min(len(camera_data),len(sensor_msgs))]]
            print("Done processing camera data with size: " + str(len(camera_msgs)))
        except:
            pass

    # read auto goals data
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        autoGoals_data = list(bag.read_messages(args.auto_goals_topic))

    if not autoGoals_data:
        print("No autoGoals data, ... continuing")
    else:
        _, _, autoGoals_start_frame, _ = align_data(tr_data, autoGoals_data)
        autoGoals_data = autoGoals_data[autoGoals_start_frame:]
        autoGoals_interval = np.round((autoGoals_data[-1][2].to_sec() - autoGoals_data[0][2].to_sec()) /
                                        (len(autoGoals_data) - 1), 5)
        autoGoals_frames = [int(round((tr[2].to_sec() - tr_start_time) / autoGoals_interval, 0)) for tr in tr_data]

        autoGoals_msgs = [msg for msg in 
                            [autoGoals_data[f].message
                            for f in autoGoals_frames 
                            if f < min(len(autoGoals_data),len(sensor_msgs))]]

        for f, s in zip(tr_json_content, autoGoals_msgs):
            f["auto_goals"] = s
        print("Done processing auto goals data, size: " + str(len(autoGoals_msgs)))

    # read tfl data
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        tfl_data = list(bag.read_messages(args.tfl_topic))

    tfl_msgs = []
    if not tfl_data:
        print("No traffic light data, ... continuing")
    else:
        _, _, tfl_start_frame, _ = align_data(tr_data, tfl_data)
        tfl_data = tfl_data[tfl_start_frame:]
        tfl_interval = np.round((tfl_data[-1][2].to_sec() - tfl_data[0][2].to_sec()) /
                                        (len(tfl_data) - 1), 5)
        tfl_frames = [int(round((tr[2].to_sec() - tr_start_time) / tfl_interval, 0)) for tr in tr_data]

        tfl_msgs = [msg for msg in [tfl_data[f].message
                            for f in tfl_frames 
                            if f < len(tfl_data)]]

        for f, s in zip(tr_json_content, tfl_msgs):
            f["tfl"] = s
        print("Done processing tfl data with size: "+ str(len(tfl_msgs)))

    # read predictions data
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        predictions_data = list(bag.read_messages(args.predictions_topic))

    if not predictions_data:
        print("No predictions data, ... continuing")
    else:
        _, _, predictions_start_frame, _ = align_data(tr_data, predictions_data)
        predictions_data = predictions_data[predictions_start_frame:]
        predictions_interval = np.round((predictions_data[-1][2].to_sec() - predictions_data[0][2].to_sec()) /
                                        (len(predictions_data) - 1), 5)
        predictions_frames = [int(round((tr[2].to_sec() - tr_start_time) / predictions_interval, 0)) for tr in tr_data]

        predictions_msgs = [msg for msg in 
                            [predictions_data[f].message
                            for f in predictions_frames 
                            if f < len(predictions_data)]]
        for f, s in zip(tr_json_content, predictions_msgs):
            f["predictions"] = s
        print("Done processing predictions data with size: " + str(len(predictions_msgs)))

    # read prm data
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        hazard_zone_data = list(bag.read_messages(args.hazard_zone_topic))

    if not hazard_zone_data:
        print("No hazard zone data, ... continuing")
    else:
        _, _, hazard_zone_start_frame, _ = align_data(tr_data, hazard_zone_data)
        hazard_zone_data = hazard_zone_data[hazard_zone_start_frame:]
        hazard_zone_interval = np.round((hazard_zone_data[-1][2].to_sec() - hazard_zone_data[0][2].to_sec()) /
                                        (len(hazard_zone_data) - 1), 5)
        hazard_zone_frames = [int(round((tr[2].to_sec() - tr_start_time) / hazard_zone_interval, 0)) for tr in tr_data]

        hazard_zone_msgs = [msg for msg in 
                            [hazard_zone_data[f].message
                            for f in hazard_zone_frames 
                            if f < len(hazard_zone_data)]]
        for f, s in zip(tr_json_content, hazard_zone_msgs):
            f["hazard_zone"] = s
        print("Done processing hazard_zone data with size: " + str(len(hazard_zone_msgs)))

    # read CtrlStateFLG for leaf overrides
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        override_data = list(bag.read_messages(args.override_topic_leaf))

    if not override_data:
        print("No CtrlStateFLG messages, ... continuing")
    else:
        _, _, override_data_start_frame, _ = align_data(tr_data, override_data)
        override_data = override_data[override_data_start_frame:]
        override_data_interval = np.round((override_data[-1][2].to_sec() - override_data[0][2].to_sec()) /
                                        (len(override_data) - 1), 5)
        override_data_frames = [int(round((tr[2].to_sec() - tr_start_time) / override_data_interval, 0)) for tr in tr_data]

        override_data_msgs = [msg for msg in 
                            [override_data[f].message
                            for f in override_data_frames 
                            if f < len(override_data)]]
        for f, s in zip(tr_json_content, override_data_msgs):
            f["CtrlStateFLG"] = s
        print("Done processing override_data data with size: " + str(len(override_data_msgs)))

    # read driver_input for ariya overrides
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        override_data_ariya = list(bag.read_messages(args.override_topic_ariya))

    if not override_data_ariya:
        print("No driver input messages, ... continuing")
    else:
        _, _, override_data_ariya_start_frame, _ = align_data(tr_data, override_data_ariya)
        override_data_ariya = override_data_ariya[override_data_ariya_start_frame:]
        override_data_ariya_interval = np.round((override_data_ariya[-1][2].to_sec() - override_data_ariya[0][2].to_sec()) /
                                        (len(override_data_ariya) - 1), 5)
        override_data_ariya_frames = [int(round((tr[2].to_sec() - tr_start_time) / override_data_ariya_interval, 0)) for tr in tr_data]

        override_data_ariya_msgs = [msg for msg in 
                            [override_data_ariya[f].message
                            for f in override_data_ariya_frames 
                            if f < len(override_data_ariya)]]
        for f, s in zip(tr_json_content, override_data_ariya_msgs):
            f["driver_input"] = s
        print("Done processing override_data_ariya data with size: " + str(len(override_data_ariya_msgs)))

    # read control_inputs for acceleration input
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        control_inputs_data = list(bag.read_messages(args.control_input_topic))

    if not control_inputs_data:
        print("No control_inputs messages, ... continuing")
    else:
        _, _, control_inputs_data_start_frame, _ = align_data(tr_data, control_inputs_data)
        control_inputs_data = control_inputs_data[control_inputs_data_start_frame:]
        control_inputs_data_interval = np.round((control_inputs_data[-1][2].to_sec() - control_inputs_data[0][2].to_sec()) /
                                        (len(control_inputs_data) - 1), 5)
        control_inputs_data_frames = [int(round((tr[2].to_sec() - tr_start_time) / control_inputs_data_interval, 0)) for tr in tr_data]

        control_inputs_data_msgs = [msg for msg in 
                            [control_inputs_data[f].message
                            for f in control_inputs_data_frames 
                            if f < len(control_inputs_data)]]
        for f, s in zip(tr_json_content, control_inputs_data_msgs):
            f["control_inputs"] = s
        print("Done processing control_inputs_data data with size: " + str(len(control_inputs_data_msgs)))


    frameMargin = 20
    defaultDist = 150

    print("Creating video:")
    create_video(input_json_tr=tr_json_content, camera_messages=camera_msgs, tfl_messages = tfl_msgs,
                 output_fname=str(output_fname), frame_margin=frameMargin, default_dist=defaultDist)

    #print("done")

def is_bag_dir(dir: Path, args) -> bool:
    contains_subdir = False
    contains_bags = False
    for item in dir.iterdir():
        if item.is_dir():
            contains_subdir = True
        elif item.is_file() and item.suffix == '.bag':
            contains_bags = True
    return contains_bags or not contains_subdir


def main(args):
    dir2process = Path(args.bags_dir)
    dir4output = Path(args.output_directory)
    #if not os.path.isdir(dir2process/snap_folder_name) and dir2process.suffix != ".bag":
        #os.makedirs(dir2process/snap_folder_name, exist_ok=True)
#################################### 
    if not (os.path.isdir(dir2process/snap_folder_name) and dir2process.suffix != ".bag"):
        os.makedirs(dir4output/snap_folder_name, exist_ok=True)
#        print ("Just printing the path for if not, ", os.path.isdir(dir2process/snap_folder_name))
####################################       
    #elif not os.path.isdir(dir2process/snap_folder_name) and dir2process.suffix == ".bag":
        #os.makedirs(dir2process.parent/snap_folder_name, exist_ok=True)
#################################### 
    elif not (os.path.isdir(dir2process/snap_folder_name) and dir2process.suffix == ".bag"):
        os.makedirs(dir4output.parent/snap_folder_name, exist_ok=True)
#        print ("Just printing the path for elif not, ", os.path.isdir(dir2process/snap_folder_name))
####################################        
    if not dir2process.is_dir() and dir2process.suffix == ".bag":
        #ret = process_directory(dir2process, args)
        try:
            ret = process_directory(dir2process, args)
            if ret == -1:
                print("Error occured with bag file: "),
                print(dir2process)
            elif ret == 2:
                print("Video for " + dir2process.name + " already exists")
        except Exception as e: 
            print(e)
            pass
    elif is_bag_dir(dir2process, args):
        for item in dir2process.iterdir():
            try:
                ret = process_directory(item, args)
                if ret == -1:
                    print("Error occured with bag file: "),
                    print(item)
                elif ret == 2:
                    print("Video for " + item.name + " already exists")
            except Exception as e: 
                print(e)
                pass

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pre-Process bag files.')
    parser.add_argument('bags_dir', type=str, help='Path to the directory with bag files: GT, Tracking, Raw')
    parser.add_argument('--output_directory', type=str, default='.', help='Path to the directory to save resim videos')
    #parser.add_argument('--gt_bag_prefix', type=str, default='labelled_bboxes_pntscnt_',
    #                    help='gt bag name: prefix + dir name + .bag')
    parser.add_argument('--track_bag_prefix', type=str, default='autonomy_log_pcp_mot_',
                        help='tracking bag name: prefix + dir name + .bag')
    parser.add_argument('--raw_bag_prefix', type=str, default='autonomy_log_for_labelling_',
                        help='raw bag name: prefix + dir name + .bag')
    #parser.add_argument('--gt_topic', type=str, default='/ground_truth/deepen/bounding_boxes',
    #                    help='Ground truth topic with objects lists per time stamp '
    #                         '(default: /ground_truth/deepen/bounding_boxes)')
    # parser.add_argument('--track_topic', type=str, default='/pc_processor/multi_object_tracker/tracked_object_set',
    #                     help='Track topic with objects lists per time stamp '
    #                          '(default: /pc_processor/multi_object_tracker/tracked_object_set)')

    parser.add_argument('--track_topic', type=str, default='/ailsv_tracked_objects',
                        help='Track topic with objects lists per time stamp '
                             '(default: /ailsv_tracked_objects)')
    parser.add_argument('--drivable_area_topic', type=str, default='/drivable_area_boundary_points',
                        help='Track topic with objects lists per time stamp '
                             '(default: /drivable_area_boundary_points)')
    parser.add_argument('--camera_topic', type=str, default='/tower_cam_front/image_cropped2/compressed',
                        help='Camera topic lists per time stamp '
                             '(default: /tower_cam_front/image_cropped2/compressed)')
    parser.add_argument('--sensor_pose_topic', type=str, default='/dynamic_global_pose',
                        help='Raw topic with sensor pose per time stamp '
                             '(default: /dynamic_global_pose)')
    parser.add_argument('--lane_id_topic', type=str, default='/drive_plan',
                        help='Lane ids used to plot the map around the AV '
                             '(default: /drive_plan)')
    parser.add_argument('--lane_planner_desired_path', type=str, default='/lane_planner_desired_path',
                        help='Plot desire path'
                             '(default: /lane_planner_desired_path)')
    parser.add_argument('--auto_goals_topic', type=str, default='/autoGoals_debug',
                        help='Plot auto goals debug'
                             '(default: /autoGoals_debug)')
    parser.add_argument('--tfl_topic', type=str, default='/tlStatus',
                        help='Plot traffic lights'
                             '(default: /tlStatus)')
    parser.add_argument('--hazard_zone_topic', type=str, default='/hazard_zone',
                        help='Plot hazard_zone'
                             '(default: /hazard_zone)')
    parser.add_argument('--predictions_topic', type=str, default='/ailsv_predicted_trajectories',
                        help='Plot predicted trajectories'
                             '(default: /ailsv_predicted_trajectories)')
    parser.add_argument('--override_topic_leaf', type=str, default='/CtrlStateFLG',
                        help='Plot overrides'
                             '(default: /CtrlStateFLG)')
    parser.add_argument('--override_topic_ariya', type=str, default='/driver_input',
                        help='Plot overrides'
                             '(default: /driver_input)')
    parser.add_argument('--control_input_topic', type=str, default='/control_inputs',
                        help='Plot input acceleration'
                             '(default: /control_inputs)')
    parser.add_argument("--extended_lead", action='store_true',
                        help="consider vehicles in next lanes left and right")
    parser.add_argument("--ignore_lead", action='store_true',
                        help="skip lead processing")
    main(parser.parse_args())
