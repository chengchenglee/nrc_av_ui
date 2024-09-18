from __future__ import annotations

import numpy as np
from typing import List, Optional, Tuple
from pathlib import Path
import json
from box import Box
from iou import IoU
from quaternion import quaternion
from scipy.optimize import linear_sum_assignment
from functools import partial
from collections import defaultdict


def quaternion_to_rotation_matrix(quaternion: np.array) -> np.array:
    """
    Convert a quaternion to a rotation matrix.
    :param quaternion: [x,y,z,w]
    :return: 3x3 transformation
    """
    if not isinstance(quaternion, np.ndarray):
        raise TypeError("quaternion must be a numpy array")

    q = quaternion / np.linalg.norm(quaternion)  # Normalize the quaternion
    qx, qy, qz, qw = q

    # Compute the elements of the rotation matrix
    r_xx = 1 - 2 * (qy ** 2 + qz ** 2)
    r_xy = 2 * (qx * qy - qz * qw)
    r_xz = 2 * (qx * qz + qy * qw)
    r_yx = 2 * (qx * qy + qz * qw)
    r_yy = 1 - 2 * (qx ** 2 + qz ** 2)
    r_yz = 2 * (qy * qz - qx * qw)
    r_zx = 2 * (qx * qz - qy * qw)
    r_zy = 2 * (qy * qz + qx * qw)
    r_zz = 1 - 2 * (qx ** 2 + qy ** 2)

    return np.array([
        [r_xx, r_xy, r_xz],
        [r_yx, r_yy, r_yz],
        [r_zx, r_zy, r_zz]
    ])


def get_transformation_matrix(translation: np.array, orienation_quaternion: np.array) -> np.array:
    """
    Construct a transformation matrix from a translation and a quaternion.
    :param translation: [x,y,z] translation vector
    :param orientation_quaternion: [x,y,z,w] rotation
    :return: 4x4 transform
    """
    # Compute the rotation matrix from the quaternion
    rotation_matrix = quaternion_to_rotation_matrix(orienation_quaternion)

    # Construct the transformation matrix
    transformation_matrix = np.eye(4)
    transformation_matrix[:3, :3] = rotation_matrix
    transformation_matrix[:3, 3] = translation

    return transformation_matrix


def get_tr_from_pose(pose):
    """
    Construct a transformation matrix from a pose.
    :param pose: NRC pose structure with position and orientation fields
    :return: 4x4 transform
    """
    position = np.array([pose.position.x, pose.position.y, pose.position.z])
    orientation = np.array([pose.orientation.x, pose.orientation.y, pose.orientation.z,
                            pose.orientation.w])
    return get_transformation_matrix(position, orientation)


def get_2d_boxes_for_ids(objs: list, ids: Optional[List[int]] = None) -> np.array:
    """
    Collect array of 2D bounding boxes from list ob NRC objects, optionally filtering by list of IDs
    :param objs: list of NRC objects
    :param ids: optional list of object IDs
    :return: Nx4 array, with rows being [x0,y0,x1,y1] coordinates of opposite corners
    """
    boxes_list = []
    for i, obj in enumerate(objs):
        if ids is not None and obj.object_id not in ids:
            continue
        assert obj.shape_model == 0  # parallelepiped
        dimensions = np.array([obj.shape_parameters.x, obj.shape_parameters.y, obj.shape_parameters.z])
        half_dims = dimensions / 2
        opposite_corners = np.array([
            [-half_dims[0], -half_dims[1], -half_dims[2]],
            [half_dims[0], half_dims[1], half_dims[2]]
        ])
        position = np.array([obj.pose.pose.position.x, obj.pose.pose.position.y, obj.pose.pose.position.z])
        corners = (opposite_corners + position)
        boxes_list.append(np.concatenate((corners[0, :2], corners[1, :2])))
    return np.stack(boxes_list) if boxes_list else np.empty((0, 4))


def obj2box(obj):
    """
    Convert NRC object to box
    :param obj: NRC object
    :return: box
    """
    assert obj.shape_model == 0  # box
    dimensions = np.array([obj.shape_parameters.x, obj.shape_parameters.y, obj.shape_parameters.z])
    position = np.array([obj.pose.pose.position.x, obj.pose.pose.position.y, obj.pose.pose.position.z])
    q = np.array([obj.pose.pose.orientation.x, obj.pose.pose.orientation.y, obj.pose.pose.orientation.z,
                  obj.pose.pose.orientation.w])
    rotation = quaternion_to_rotation_matrix(q)
    return Box.from_transformation(rotation, position, dimensions)


def find_first_lv(sensor, gt):
    """
    Find the first lead vehicle(s) as the one that it's location (box) sensor trajectory will intersect
    :param sensor: sensor messages
    :param gt: ground truth messages
    :return: ts: time of intersection,
             tt_s: ground truth start time such as found lead vehicles don't intersect with trajectory at time ts
             leads: list pf lead vehicles ids
    """
    leads = []
    for igt, (tt, gt_objs) in enumerate(gt):
        gt_boxes = [obj2box(obj) for obj in gt_objs]
        for isp, (ts, sp) in enumerate(sensor):
            for obj, box in zip(gt_objs, gt_boxes):
                # if obj.motion_model != obj.MOTIONMODEL_Static and box.inside(sp, axes=range(2)):
                if box.inside(sp, axes=range(2)):
                    leads.append(obj.object_id)
            if leads:
                tt_s = gt[igt][0]
                return ts, tt_s, leads

                # find gt start time, so found vehicles don't intersect with trajectory at ts
                for igt_s, (tt_s, gt_obj_s) in enumerate(gt[igt:]):
                    intersection = False
                    for obj in [obj for obj in gt_obj_s if obj.object_id in leads]:
                        box = obj2box(obj)
                        if box.inside(sp, axes=range(2)):
                            intersection = True
                            break
                    if not intersection:
                        break
                return ts, tt_s, leads
    return 0, 0, []


def lead_vehicles_gt_by_frame(sensor_pose_data: list, gt_data: list, extended=False) -> list[list[int]]:
    """
     Identify lead vehicle in Ground Truth data per frame
    :param sensor_pose_data: list of ROS BagMessage objects, where message is of DynamicPoseWithCovar type.
    :param gt_data: list of ROS BagMessage objects, where message is of TrackedObjectSet type.
    :param extended: if True consider neighbouring lanes
    :return: lists of object IDs per frame
    """

    # sanity check
    if not sensor_pose_data or not gt_data:
        return []

    # consider vehicle objects from GT
    gt_objs = [(t.to_sec(),
                [obj for obj in msg.objects
                 if obj.classification in [obj.CLASSIFICATION_Car, obj.CLASSIFICATION_Truck]])
               for _, msg, t in gt_data]

    # sensor position sequence
    sensor_tr = [get_tr_from_pose(msg.pose) for (_, msg, t) in sensor_pose_data]
    sensor_pos = [(t.to_sec(), np.dot(sensor_tr[f], np.array([0, 0, 0, 1]).T).T[:3])
                  for f, (_, msg, t) in enumerate(sensor_pose_data)]
    sensor_rot = [np.array(sensor_tr[f][:3, :3]) for f, (_, msg, t) in enumerate(sensor_pose_data)]

    experiment_start_time = sensor_pos[0][0]

    # get GT lead vehicles
    ids_seq = []
    start_time_sensor = sensor_pos[0][0]
    start_time_gt = start_time_sensor
    while start_time_sensor > 0:
        # sensor_pos = [(t, p[:3]) for (t, p) in sensor_pos if t >= max(start_time_sensor - 1, sensor_pos[0][0])]
        sensor_pos = [(t, p[:3]) for (t, p) in sensor_pos if t >= start_time_sensor]
        gt_objs = [go for go in gt_objs if go[0] > start_time_gt]
        if not sensor_pos or not gt_objs:
            break
        next_start_time_sensor, next_start_time_gt, leads = find_first_lv(sensor_pos, gt_objs)
        # if leads:
        #     print(f"{start_time_sensor - experiment_start_time:.2f}", f"{start_time_gt - experiment_start_time:.2f}",
        #           leads)
        ids_seq.append(leads)

        if extended:
            left, right = feet_in_meters(12), feet_in_meters(-12)
            range_sensor_pos, range_sensor_rot = [], []
            for ((t, p), r) in zip(sensor_pos, sensor_rot):
                if t >= start_time_sensor and (not leads or t < next_start_time_sensor):
                    range_sensor_pos.append((t, p[:3]))
                    range_sensor_rot.append(r)
                    # range_sensor_pos, range_sensor_rot = [((t, p[:3]), r) for ((t, p), r) in zip(sensor_pos, sensor_rot)
                    #                                       if
                    #                                       t >= start_time_sensor and (
                    #                                                   not leads or t < next_start_time_sensor)]
            for lane_width in [left, right]:
                offset = np.array([0, lane_width if left else -lane_width, 0])
                adjusted_sensor_pos = [(t, p + np.dot(r, offset)) for (t, p), r in
                                       zip(range_sensor_pos, range_sensor_rot)]
                lane_ts, _, lane_leads = find_first_lv(adjusted_sensor_pos, gt_objs)
                if lane_ts < next_start_time_sensor:
                    ids_seq[-1].extend(lane_leads)

        start_time_sensor, start_time_gt = next_start_time_sensor, next_start_time_gt

    return ids_seq


def lead_vehicles_gt(sensor_pose_data, gt_data, extended=False) -> List[int]:
    """
    Identify lead vehicle in Ground Truth data
    :param sensor_pose_data:
    :param gt_data:
    :param extended: if True consider neighbouring lanes
    :return: lists of object IDs
    """

    ids_set = set()
    for ids in lead_vehicles_gt_by_frame(sensor_pose_data, gt_data, extended):
        ids_set |= set(ids)
    return sorted(list(ids_set))


def lead_vehicles(sensor_pose_data, gt_data, tr_data, extended=False) -> Tuple[List[int], List[int]]:
    """
    Identify lead vehicle in Ground Truth data, then find corresponding vehicles in tracker data
    :param sensor_pose_data:
    :param gt_data:
    :param tr_data:
    :param extended: if True consider neighbouring lanes
    :return: 2 lists (GT and tracker) of object IDs
    """

    # get GT lead vehicles
    lead_gt_ids = lead_vehicles_gt(sensor_pose_data, gt_data, extended)

    # get tracker lead vehicles,
    # as those that at least at some frame overlapping with one of GT lead vehicles
    tr_ids = set()
    min_iou = 0.1
    min_giou = -0.5  # from paper
    # low value to use the same iou threshold for giou
    low = (min_giou - min_iou) / (1 - min_iou)
    use_giou = True

    for f, ((_, gt_msg, _), (_, tr_msg, _)) in enumerate(zip(gt_data, tr_data)):
        # print(f)
        gt_boxes = [obj2box(obj) for obj in gt_msg.objects if obj.object_id in lead_gt_ids]
        tr_boxes = [obj2box(obj) for obj in tr_msg.objects]

        ious = np.empty((len(tr_boxes), len(gt_boxes)))
        for i, tr_box in enumerate(tr_boxes):
            for j, gt_box in enumerate(gt_boxes):
                try:
                    ious[i, j] = IoU(gt_box, tr_box).giou(low=low) if use_giou \
                        else IoU(gt_box, tr_box).iou()
                except np.linalg.LinAlgError as e:
                    print(e)
                    ious[i, j] = 0

        for i in range(ious.shape[0]):
            if ious.shape[1] and np.max(ious[i, :]) > min_iou:
                tr_ids.add(tr_msg.objects[i].object_id)

    return sorted(list(lead_gt_ids)), sorted(list(tr_ids))


def align_objects_temporaliy(gt_objects, tr_objects):
    seq_len = len(gt_objects)
    seq_start = gt_objects[0]['t']
    seq_frame_interval = np.round((gt_objects[-1]['t'] - gt_objects[0]['t']) / (seq_len - 1), 5)
    start_frame = 0
    while tr_objects[start_frame]['t'] < seq_start - seq_frame_interval / 2:
        start_frame += 1
    return start_frame, start_frame + seq_len


def align_data(gt_data, tr_data):
    # align tr_data with gt_data by timestamps
    gt_len = len(gt_data)
    tr_len = len(tr_data)
    gt_start = gt_data[0][2].to_sec()
    tr_start = tr_data[0][2].to_sec()
    tr_frame_interval = np.round((tr_data[-1][2].to_sec() - tr_data[0][2].to_sec()) / (tr_len - 1), 5)
    gt_frame_interval = np.round((gt_data[-1][2].to_sec() - gt_data[0][2].to_sec()) / (gt_len - 1), 5)
    gt_start_frame = 0
    tr_start_frame = 0
    if tr_start < gt_start - tr_frame_interval / 2:
        while tr_start_frame < len(tr_data) and tr_data[tr_start_frame][2].to_sec() < gt_start - tr_frame_interval / 2:
            tr_start_frame += 1
    else:
        gt_frame_interval = np.round((gt_data[-1][2].to_sec() - gt_data[0][2].to_sec()) / (gt_len - 1), 5)
        while gt_start_frame < len(gt_data) and gt_data[gt_start_frame][2].to_sec() < tr_start - gt_frame_interval / 2:
            gt_start_frame += 1

    num_frames = min(len(tr_data) - tr_start_frame, len(gt_data) - gt_start_frame)
    tr_end_frame = tr_start_frame + num_frames
    gt_end_frame = gt_start_frame + num_frames

    # print([int((gt_data[i + gt_start_frame - tr_start_frame][2].to_sec() - tr_data[i][2].to_sec()) * 100) for i in range(tr_start_frame, tr_end_frame)])

    return gt_start_frame, gt_end_frame, tr_start_frame, tr_end_frame


def interpolate_gt(gt_data, tr_data) -> tuple:
    # create syntetic GT by interpolating and sampling according to TR time stamps

    gt_start = gt_data[0][2].to_sec()
    gt_end = gt_data[-1][2].to_sec()
    tr_start_frame = 0
    while tr_start_frame < len(tr_data) and tr_data[tr_start_frame][2].to_sec() < gt_start:
        tr_start_frame += 1
    tr_end_frame = len(tr_data) - 1
    while tr_end_frame > tr_start_frame and tr_data[tr_end_frame][2].to_sec() > gt_end:
        tr_end_frame -= 1
    new_tr_data = tr_data[tr_start_frame: tr_end_frame]

    new_gt_data = []
    gt_frame = 0
    for tr_frame, tr in enumerate(new_tr_data):
        t = tr[2].to_sec()
        while gt_frame < len(gt_data) and gt_data[gt_frame][2].to_sec() < t:
            gt_frame += 1
        gt_next = gt_data[gt_frame]
        gt_prev = gt_data[gt_frame - 1]
        k = (t - gt_prev[2].to_sec()) / (gt_next[2].to_sec() - gt_prev[2].to_sec())

        def interpolate(a, b):
            return a + (b - a) * k

        def next_object(obj):
            for _obj in gt_next[1].objects:
                if _obj.object_id == obj.object_id:
                    return _obj
            # if noot found for simplicity return the input
            return obj

        timestamp = tr[2]
        topic = tr[0]
        message = gt_prev[1]
        for obj in message.objects:
            pobj = obj
            nobj = next_object(obj)
            obj.pose.pose.orientation.x = interpolate(pobj.pose.pose.orientation.x, nobj.pose.pose.orientation.x)
            obj.pose.pose.orientation.y = interpolate(pobj.pose.pose.orientation.y, nobj.pose.pose.orientation.y)
            obj.pose.pose.orientation.z = interpolate(pobj.pose.pose.orientation.z, nobj.pose.pose.orientation.z)
            obj.pose.pose.orientation.w = interpolate(pobj.pose.pose.orientation.w, nobj.pose.pose.orientation.w)
            obj.pose.pose.position.x = interpolate(pobj.pose.pose.position.x, nobj.pose.pose.position.x)
            obj.pose.pose.position.y = interpolate(pobj.pose.pose.position.y, nobj.pose.pose.position.y)
            obj.pose.pose.position.z = interpolate(pobj.pose.pose.position.z, nobj.pose.pose.position.z)

        new_gt_data.append((topic, message, timestamp))

    return new_gt_data, new_tr_data


def lead_vehicles_from_bags(raw_bag_fn: str, sensor_pose_topic: str,
                            gt_bag_fn: str, gt_topic: str,
                            track_bag_fn: str, track_topic: str, extended=False) -> Tuple[List[int], List[int]]:
    """
    Identify lead vehicle in Ground Truth bag file using raw sensor data,
    then find corresponding vehicles in tracker bag
    :param raw_bag_fn: name of bag file with raw sensor data
    :param sensor_pose_topic: name of ROS topic with sensor pose data
    :param gt_bag_fn: name of bag file with ground truth data
    :param gt_topic: name of ROS topic with ground truth objects
    :param track_bag_fn: name of bag file with tracker data
    :param track_topic: name of ROS topic with tracker objects
    :param extended: if True consider neighbouring lanes
    :return: 2 lists (GT and tracker) of object IDs
    """
    import rosbag

    # read ground truth data
    with rosbag.Bag(gt_bag_fn) as bag:
        gt_data = list(bag.read_messages(gt_topic))

    # read tracker data
    with rosbag.Bag(track_bag_fn) as bag:
        tr_data = list(bag.read_messages(track_topic))

    # align tr_data with gt_data by timestamps
    gt_start_frame, gt_end_frame, tr_start_frame, tr_end_frame = align_data(gt_data, tr_data)
    tr_data = tr_data[tr_start_frame: tr_end_frame]
    gt_data = gt_data[gt_start_frame: gt_end_frame]

    # read sensor pose data
    with rosbag.Bag(raw_bag_fn) as bag:
        sensor_pose_data = list(bag.read_messages(sensor_pose_topic))[gt_start_frame:]

    return lead_vehicles(sensor_pose_data, gt_data, tr_data, extended)


def obj2dict(obj) -> dict:
    d = dict()

    if hasattr(obj, 'pose'):
        pose = obj.pose.pose if hasattr(obj.pose, 'pose') else obj.pose
        d["pose"] = {"orientation": [pose.orientation.x,
                                     pose.orientation.y,
                                     pose.orientation.z,
                                     pose.orientation.w],
                     "position": [pose.position.x,
                                  pose.position.y,
                                  pose.position.z]}

    if hasattr(obj, "classification"):
        d["classification"] = obj.classification
    if hasattr(obj, "object_id"):
        d["object_id"] = obj.object_id
    if hasattr(obj, "shape_model"):
        d["shape_model"] = obj.shape_model
    if hasattr(obj, "shape_parameters"):
        d["shape_parameters"] = [obj.shape_parameters.x,
                                 obj.shape_parameters.y,
                                 obj.shape_parameters.z]
    if hasattr(obj, 'gt_object_id'):
        d["gt_object_id"] = obj.gt_object_id
    return d


def bag2json(bag_fn: str, topic: str, ids: Optional[List[int]] = None) -> List[dict]:
    """
    Convert a bag file to a json compatible list with list of objects for each timestamp
    :param bag_fn: bag file name
    :param topic: name of topic to extract object info from
    :param ids: if present skip objects with id not in this list
    :return: list of dicts per stamp
    """
    import rosbag

    content = []
    with rosbag.Bag(bag_fn) as bag:
        # info = bag.get_type_and_topic_info()
        # for topic, ti in info.topics.items():
        #     print(topic, ti)

        for topic, msg, t in bag.read_messages(topic):
            record = {"t": t.to_sec(), "objects": []}
            for obj in msg.objects:
                if ids is not None and obj.object_id not in ids:
                    continue
                record["objects"].append(obj2dict(obj))
            content.append(record)
    return content


def json2file(content, base_fn: str, suffix: Optional[str] = None, subdir: Optional[Path] = None) -> str:
    # add suffix to filename
    p = Path(base_fn)
    new_file_name = f"{p.stem}_{suffix}.json" if suffix else f"{p.stem}.json"
    if subdir is not None:
        new_file_name = subdir / new_file_name
    json_path = p.parent / new_file_name
    with (json_path.open("w")) as f:
        json.dump(content, f, indent=2)

    return str(json_path)


def save_bag_to_json_file(bag_fn: str, topic: str, ids: Optional[List[int]] = None,
                          suffix: Optional[str] = None) -> str:
    """
    Convert a json compatible bag file to a json file with list of objects for each timestamp
    :param bag_fn: input bag file name
    :param topic: name of topic to extract object info from
    :param ids: if present skip objects with id not in this list
    :param suffix: if present add suffix to output file name
    :return:
    """
    content = bag2json(bag_fn, topic, ids)
    return json2file(content, bag_fn, suffix)


class Vector3d:
    x: float
    y: float
    z: float

    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

    @classmethod
    def from_nrc(cls, nrc) -> 'Vector3d':
        return cls(x=nrc.x, y=nrc.y, z=nrc.z)


class Pose:
    position: Vector3d
    orientation: quaternion

    def __init__(self, position=Vector3d(0, 0, 0), orientation=quaternion(1, 0, 0, 0)):
        self.position = position
        self.orientation = orientation

    class Config:
        arbitrary_types_allowed = True

    @classmethod
    def from_nrc(cls, nrc) -> 'Pose':
        return cls(
            position=Vector3d.from_nrc(nrc.position),
            orientation=quaternion(nrc.orientation.w, nrc.orientation.x, nrc.orientation.y, nrc.orientation.z)
        )


class Obj:
    classification: int
    object_id: int
    gt_object_id: int
    pose: Pose
    shape_model: int
    shape_parameters: Vector3d

    def __init__(self, classification, object_id, gt_object_id, pose, shape_model, shape_parameters):
        self.classification = classification
        self.object_id = object_id
        self.gt_object_id = gt_object_id
        self.pose = pose
        self.shape_model = shape_model
        self.shape_parameters = shape_parameters

    @classmethod
    def from_nrc(cls, nrc) -> 'Obj':
        return cls(
            classification=nrc.classification,
            object_id=nrc.object_id,
            gt_object_id=-1,
            pose=Pose.from_nrc(nrc.pose.pose),
            shape_model=nrc.shape_model,
            shape_parameters=Vector3d.from_nrc(nrc.shape_parameters)
        )


def compute_similarities(gt_boxes, tr_boxes, use_giou=True):
    min_iou = 0.1
    min_giou = -0.5  # from paper
    # low value to use the same iou threshold for giou
    low = (min_giou - min_iou) / (1 - min_iou)

    similarity_scores = np.empty((len(gt_boxes), len(tr_boxes)))
    for i, gt_box in enumerate(gt_boxes):
        for j, tr_box in enumerate(tr_boxes):
            try:
                similarity_scores[i, j] = IoU(gt_box, tr_box).giou(low=low) if use_giou \
                    else IoU(gt_box, tr_box).iou()
            except np.linalg.LinAlgError as e:
                print(e)
                similarity_scores[i, j]
    return similarity_scores


def generate_tr_json(gt, tr, use_giou=True) -> dict:
    """
    Using IOU ignore tr objects that don't overlap with any objects in gt and
    for those that do overlap assign class label from the most overlapped gt object.

    gt, tr are messages with objects for particular time stamp
    """
    # gt, tr are messages with objects for particular time stamp
    _, gt_msg, _ = gt
    _, tr_msg, t = tr

    if not gt_msg.objects:
        return {"t": t.to_sec(), "objects": [], "gt": []}

    gt_boxes = [obj2box(obj) for obj in gt_msg.objects]
    tr_boxes = [obj2box(obj) for obj in tr_msg.objects]

    min_iou = 0.1

    similarity_scores = compute_similarities(gt_boxes, tr_boxes, use_giou)

    # Match tracker and gt dets (with hungarian algorithm)
    new_tracker_objects = []
    new_gt_objects = []
    unmatched_indices = np.arange(len(tr_boxes))
    if len(gt_boxes) > 0 and len(tr_boxes) > 0:
        matching_scores = similarity_scores.copy()
        # matching_scores[matching_scores < min_iou - np.finfo('float').eps] = 0
        match_rows, match_cols = linear_sum_assignment(-matching_scores)
        for mr, mc in zip(match_rows, match_cols):
            if matching_scores[mr, mc] < np.finfo('float').eps:
                continue
            # if gt_msg.objects[mr].motion_model != gt_msg.objects[mr].MOTIONMODEL_Moving:
            #     continue
            gt_class = gt_msg.objects[mr].classification
            gt_id = gt_msg.objects[mr].object_id
            tracker_obj = Obj.from_nrc(tr_msg.objects[mc])
            tracker_obj.classification = gt_class
            tracker_obj.gt_object_id = gt_id
            new_tracker_objects.append(tracker_obj)
            new_gt_objects.append(gt_msg.objects[mr])

            # if tracker_obj.object_id not in [248, 346] and gt_id == 1001:
            #     print([[obj.object_id for obj in gt_msg.objects]])
            #     print([[obj.object_id for obj in tr_msg.objects]])
            #     print(similarity_scores)
            #     print()

    return {"t": t.to_sec(), "objects": new_tracker_objects, "gt": new_gt_objects}


def read_bag_data(bags_dir, gt_topic, gt_bag_prefix, track_topic, track_bag_prefix, sensor_pose_topic, raw_bag_prefix):
    """
    Read ground truth and tracker data from bags
    """
    import rosbag

    bags_base_name = str(bags_dir.name)
    gt_bag_fn = bags_dir / Path(gt_bag_prefix + bags_base_name + '.bag')
    if not gt_bag_fn.exists():
        raise ValueError(f"{gt_bag_fn} does not exists")
    track_bag_fn = bags_dir / Path(track_bag_prefix + bags_base_name + '.bag')
    if not track_bag_fn.exists():
        raise ValueError(f"{track_bag_fn} does not exists")
    raw_bag_fn = bags_dir / Path(raw_bag_prefix + bags_base_name + '.bag')
    if not raw_bag_fn.exists():
        raise ValueError(f"{raw_bag_fn} does not exists")

    # read ground truth data
    with rosbag.Bag(str(gt_bag_fn)) as bag:
        gt_data = list(bag.read_messages(gt_topic))

    # gt_data = gt_data[217:]

    # read tracker data
    with rosbag.Bag(str(track_bag_fn)) as bag:
        topics = [topic for (topic, _) in bag.get_type_and_topic_info().topics.items()]
        if track_topic not in topics:
            raise ValueError(f"topic {track_topic} not present at {track_bag_fn}\n"
                             f"If you want one of {topics}, use --gt_topic <name>")
        tr_data = list(bag.read_messages(track_topic))

    # read sensor pose data
    with rosbag.Bag(str(raw_bag_fn)) as bag:
        sensor_pose_data = list(bag.read_messages(sensor_pose_topic))

    return gt_data, tr_data, sensor_pose_data


def gt_lead_for_timestamp(gt, sensor_pos, extended=False) -> dict[int, tuple[float, float]]:
    """
    Computes the lead vehicle for a given timestamp

    Finds intersection of sensor trajectory with GT boxes
    :param gt: (topic, msg, timestamp)
    :param sensor_pos: list of (timestamp, position)
    :param extended: if True, extend the lead vehicle to the side of the sensor
    :return: dict of (object_id, (start_intersect, stop_intersect))
    """
    (_, msg, gt_t) = gt
    split_gap = 50  # 0.5 sec
    gt_objs = defaultdict(list)
    lane_width = feet_in_meters(12)

    for obj in msg.objects:
        # if obj.classification in [obj.CLASSIFICATION_Car, obj.CLASSIFICATION_Truck] and \
        # obj.motion_model != obj.MOTIONMODEL_Static:
        if obj.classification in [obj.CLASSIFICATION_Car, obj.CLASSIFICATION_Truck]:
            obj.pose.pose.position.z = 0
            box = obj2box(obj)
            start, stop = -1, -1
            for sensor_idx, (s_t, sp) in enumerate(sensor_pos):
                if s_t < gt_t.to_sec():
                    continue
                if start > 0 and sensor_idx > stop + split_gap:
                    gt_objs[obj.object_id] = (start, stop)
                    start, stop = -1, -1
                    break
                # assume ego car extends to at least tolerance to the side of the sensor
                if box.inside(sp, axes=range(2), tolerance=[0, lane_width if extended else 0, 0]):
                    if start < 0:
                        start = sensor_idx
                    stop = sensor_idx + 1
            if start > 0:
                gt_objs[obj.object_id] = (start, stop)
    return gt_objs


def compute_lead_vehicle_per_gt_frame(gt_data, sensor_pos, extended=False) -> list[tuple[int | str, int, int]]:
    """
    Computes the lead vehicle per GT frame
    :param gt_data: list of (topic, msg, timestamp)
    :param sensor_pos: list of (timestamp, position)
    :param extended: if True, extend the lead vehicle to include potential lead vehicles in next lames
    :return: list of (object_id, start_intersect, stop_intersect)
    """
    from p_tqdm import p_map

    # GT intersections with sensor_pos: id - [(gt_idx, sensor_idx)
    gt_objs_ts = p_map(partial(gt_lead_for_timestamp, sensor_pos=sensor_pos, extended=extended), gt_data)
    # gt_objs_ts = map(partial(gt_lead_for_timestamp, sensor_pos=sensor_pos, extended=extended), gt_data)
    gt_objs = defaultdict(list)
    for gt_idx, lead_byts in enumerate(gt_objs_ts):
        for obj_id, interval in lead_byts.items():
            gt_objs[obj_id].append((gt_idx, interval))

    # lead vehicle per GT timestamp
    # print("finding lead vehicle per GT timestamp")
    lead_vehicles = defaultdict(list)
    for gt_idx, sensor_idxs in gt_objs.items():
        for sensor_idx in sensor_idxs:
            lead_vehicles[sensor_idx].append(gt_idx)

    # lead vehicle per sensor timestamp
    # print("finding lead vehicle per sensor timestamp")
    lead_vehicles_per_sensor = defaultdict(list)
    for sensor_idx, gt_idxs in lead_vehicles.items():
        for gt_idx in gt_idxs:
            lead_vehicles_per_sensor[sensor_idx].append(gt_idx)

    # lead vehicle per sensor id
    # print("finding lead vehicle per sensor id")
    lead_by_gt_frame = []
    for f in range(len(gt_data)):
        object_id = -1
        start_intersect = -1
        stop_intersect = -1
        for gt_id in gt_objs:
            start, stop = -1, -1
            for gt_frame, (s0, s1) in gt_objs[gt_id]:
                if gt_frame > f:
                    break
                if gt_frame == f:
                    if start < 0:
                        start = s0
                    stop = max(stop, s1)
            if (start_intersect < 0 or 0 <= start < start_intersect) and start >= 0:
                start_intersect = start
                stop_intersect = stop
                object_id = gt_id

        lead_by_gt_frame.append((object_id, start_intersect, stop_intersect))
    return lead_by_gt_frame


def feet_in_meters(feet):
    return feet * 0.3048


def compute_potential_lead_vehicle_per_gt_frame(gt_data, sensor_pos, sensor_rot: np.array, left: bool) \
        -> list[tuple[int | str, int, int]]:
    """
    Computes the potential lead vehicle per GT frame, meaning
    vehicles in the left (if left par is true, right otherwise) lane that are ahead of ego but behind current lead if any
    :param gt_data: list of (topic, msg, timestamp)
    :param sensor_pos: list of (timestamp, position)
    :param sensor_rot: list of (timestamp, 3x3 rotation matrix)
    :param lead: result of compute_lead_vehicle_per_gt_frame : list of (object_id, start_intersect, stop_intersect)
    :param left: True if left lane, False otherwise
    :return: list of (object_id, start_intersect, stop_intersect)
    """

    # prepare shifted sensor trajectory and apply compute_lead_vehicle_per_gt_frame
    lane_width = feet_in_meters(12)
    offset = np.array([0, lane_width if left else -lane_width, 0])
    adjusted_sensor_pos = [(t, p + np.dot(r, offset)) for (t, p), r in zip(sensor_pos, sensor_rot)]
    return compute_lead_vehicle_per_gt_frame(gt_data, adjusted_sensor_pos)
