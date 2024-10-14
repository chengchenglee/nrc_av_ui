import argparse
import rosbag
from sensor_msgs.msg import PointCloud2
from sensor_msgs import point_cloud2
from pathlib import Path
import numpy as np
import cv2
from collections import defaultdict, Counter
import quaternion
from nrc_utils import align_data, compute_lead_vehicle_per_gt_frame, generate_tr_json, \
    lead_vehicles, get_tr_from_pose, get_transformation_matrix, \
    quaternion_to_rotation_matrix, get_2d_boxes_for_ids
from p_tqdm import p_map
from functools import partial
import copy


VIEW_WIDTH = 20000
VIEW_HEIGHT = 10000


def get_object_classes(msgs):
    classes = defaultdict(lambda: list())
    for msg in msgs:
        for obj in msg[1].objects:
            classes[obj.object_id].append(obj.classification)
    classified = {}
    for c in sorted(classes.items()):
        cnt = Counter(c[1])
        if len(cnt) > 1 or len(cnt) == 1 and list(cnt.keys())[0] != 0:
            # print(c[0], Counter(c[1]))
            classified[c[0]] = Counter(c[1])
    return classified


def viz_sensor(image, sensor_pose_data, s_xy_int, color):
    origin = np.array([0, 0, 0, 1])
    start_time = sensor_pose_data[0][2].to_sec()
    last_time = 0
    interval = 5
    for i, (_, msg, t) in enumerate(sensor_pose_data):
        timestamp = t.to_sec() - start_time
        tr = get_tr_from_pose(msg.pose)
        p = np.dot(tr, origin.T).T
        xy = s_xy_int(p[0:2])
        if i == 0:
            cv2.circle(image, xy, 30, color, -1)
        elif timestamp - last_time >= interval:
            cv2.circle(image, xy, 10, color, -1)
            cv2.putText(image, f" @{timestamp:.2f}", xy, cv2.FONT_HERSHEY_PLAIN, 1.5, color)
            last_time = timestamp
        else:
            cv2.line(image, prev, xy, color, 2)
        prev = xy


def viz_pc(image, s_xy_int):
    with rosbag.Bag(raw_bag_fn) as bag:
        # info = bag.get_type_and_topic_info()
        # for topic, ti in info.topics.items():
        #     print(topic, ti)
        for _, msg, t in bag.read_messages(sensor_pose_topic):
            tr = get_tr_from_pose(msg.pose)
            break

    with rosbag.Bag(pc_bag_fn) as bag:
        # info = bag.get_type_and_topic_info()
        # for topic, ti in info.topics.items():
        #     print(topic, ti)

        for _, msg, t in bag.read_messages(pc_topic):
            points = np.array(list(point_cloud2.read_points(msg, field_names=("x", "y", "z"), skip_nans=True)))
            points_homogeneous = np.hstack((points, np.ones((points.shape[0], 1))))
            transformed_points_homogeneous = np.dot(tr, points_homogeneous.T).T
            # points = transformed_points_homogeneous[:, :3]
            for point in transformed_points_homogeneous:
                xy = s_xy_int(point[:2])
                if not (0 <= xy[0] < image.shape[1] and 0 <= xy[1] < image.shape[0]):
                    continue
                image[xy[1], xy[0]] = (255, 255, 255)

            # min_p = np.min(points, axis=0)
            # max_p = np.max(points, axis=0)
            # print(points)


def objs2bbox(objs):
    dets = []
    for ann in objs:
        # prepare opposite corners of bounding box. Assume 2D
        assert ann.shape_model == 0  # parallelepiped
        dimensions = np.array([ann.shape_parameters.x, ann.shape_parameters.y, ann.shape_parameters.z])
        half_dims = dimensions / 2
        opposite_corners = np.array([
            [-half_dims[0], -half_dims[1], -half_dims[2]],
            [half_dims[0], half_dims[1], half_dims[2]]
        ])
        tr = get_tr_from_pose(ann.pose.pose)
        points_homogeneous = np.hstack((opposite_corners, np.ones((opposite_corners.shape[0], 1))))
        rotated_corners = np.dot(tr, points_homogeneous.T).T

        # rotation_quaternion = [ann.pose.pose.orientation.x, ann.pose.pose.orientation.y, ann.pose.pose.orientation.z,
        #                        ann.pose.pose.orientation.w]
        # rotation = quaternion.quaternion(*rotation_quaternion)
        # position = np.array([ann.pose.pose.position.x, ann.pose.pose.position.y, ann.pose.pose.position.z])
        # rotated_corners = quaternion.rotate_vectors(rotation, opposite_corners) + position
        # rotated_corners = opposite_corners + position
        x1 = rotated_corners[0][0]
        y1 = rotated_corners[0][1]
        z1 = rotated_corners[0][2]
        x2 = rotated_corners[1][0]
        y2 = rotated_corners[1][1]
        z2 = rotated_corners[1][2]
        dets.append([x1, y1, z1, x2, y2, z2])
    dets = np.atleast_2d(dets).astype(float)
    dets_max = np.max(dets, axis=0)
    dets_min = np.min(dets, axis=0)
    return np.array([min(dets_min[0], dets_min[3]), min(dets_min[1], dets_min[4]),
                     max(dets_max[0], dets_max[3]), max(dets_max[1], dets_max[4])])


def viz(#gt_data, 
        tr_data, sensor_pos_data, filename="viz.png", 
        #gt_ids=None, 
        tr_ids=None,
        additional_boxes_at=None, leads=None):

    def get_objects(_f):
        #_gt_objs = gt_data[_f][1].objects if gt_ids is None \
        #    else [obj for obj in gt_data[_f][1].objects if obj.object_id in gt_ids]
        _tr_objs = tr_data[_f][1].objects if tr_ids is None \
            else [obj for obj in tr_data[_f][1].objects if obj.object_id in tr_ids]
        #return _gt_objs, _tr_objs
        return _tr_objs

    def create_image():
        bbs = []
        for _f in range(seq_len):
            #_gt_objs, 
            _tr_objs = get_objects(_f)
            #if _gt_objs:
            #    bbs.append(objs2bbox(_gt_objs))
            if _tr_objs:
                bbs.append(objs2bbox(_tr_objs))
        bbs = np.array(bbs)
        x0 = np.min(bbs[:, 0])
        y0 = np.min(bbs[:, 1])
        x1 = np.max(bbs[:, 2])
        y1 = np.max(bbs[:, 3])
        for s in sensor_pos_data:
            x0 = min(x0, s[1].pose.position.x)
            y0 = min(y0, s[1].pose.position.y)
            x1 = max(x1, s[1].pose.position.x)
            y1 = max(y1, s[1].pose.position.y)
        x0 -= 1
        y0 -= 1
        x1 += 1
        y1 += 1
        ratio = (x1 - x0) / (y1 - y0)
        vw, vh = VIEW_WIDTH, VIEW_HEIGHT
        if ratio > 1:
            vh = int(vw / ratio)
        else:
            vw = int(vh * ratio)
        x_scale = vw / (x1 - x0)
        y_scale = vh / (y1 - y0)

        def scale_x(x):
            return (x - x0) * x_scale

        def scale_y(y):
            return vh - (y - y0) * y_scale

        def scale_xy(xy):
            return [scale_x(xy[0]), scale_y(xy[1])]

        return np.zeros((vh, vw, 3), dtype=np.uint8), lambda xy: [int(c) for c in scale_xy(xy)]

    #seq_len = len(gt_data)
    seq_len = len(tr_data)
    image, s_xy_int = create_image()
    #gt_last = {}
    tr_last = {}
    for f in range(seq_len):
        #gt_objs, 
        tr_objs = get_objects(f)

        def draw_ann(objs, color, last_pos, draw_rect=True):
            for ann in objs:
                draw_rect_obj = draw_rect
                c = color if ann.classification > 2 else tuple(c // 4 for c in color)
                # if ann.classification == 0:
                #     continue
                # if ann.motion_model != 7:
                #     continue
                xy = s_xy_int([ann.pose.pose.position.x, ann.pose.pose.position.y])
                if ann.object_id in last_pos:
                    cv2.line(image, last_pos[ann.object_id], xy, c, 1)
                else:
                    draw_rect_obj = True
                last_pos[ann.object_id] = xy
                if draw_rect_obj:
                    assert ann.shape_model == 0  # parallelepiped
                    dimensions = np.array([ann.shape_parameters.x, ann.shape_parameters.y, ann.shape_parameters.z])
                    half_dims = dimensions / 2
                    corners = np.array([
                        [-half_dims[0], -half_dims[1], 0],
                        [-half_dims[0], half_dims[1], 0],
                        [half_dims[0], half_dims[1], 0],
                        [half_dims[0], -half_dims[1], 0],
                    ])
                    tr = get_tr_from_pose(ann.pose.pose)
                    points_homogeneous = np.hstack((corners, np.ones((corners.shape[0], 1))))
                    corners = np.dot(tr, points_homogeneous.T).T

                    l = 4 if ann.motion_model == 7 else 1
                    cv2.line(image, s_xy_int(corners[0]), s_xy_int(corners[1]), c, l)
                    cv2.line(image, s_xy_int(corners[1]), s_xy_int(corners[2]), c, l)
                    cv2.line(image, s_xy_int(corners[2]), s_xy_int(corners[3]), c, l)
                    cv2.line(image, s_xy_int(corners[3]), s_xy_int(corners[0]), c, l)

                    # middle of rear bumper
                    mrb = np.dot(tr, np.array([-half_dims[0], 0, 0, 1]).T).T
                    mrf = np.dot(tr, np.array([half_dims[0], 0, 0, 1]).T).T
                    cv2.circle(image, s_xy_int(mrb), 7, c, -1)

                    l = np.linalg.norm(mrf - mrb)
                    p = mrb - (mrf - mrb) / l * 0.5 if l > np.finfo(float).eps else mrb
                    cv2.putText(image, f"{ann.object_id}@{timestamp:.1f}", s_xy_int(p), cv2.FONT_HERSHEY_PLAIN, 1, c)

        # if f == 0:
        #     viz_pc(image, s_xy_int, start_frame)
        #timestamp = gt_data[f][2].to_sec() - sensor_pos_data[0][2].to_sec()
        timestamp = tr_data[f][2].to_sec() - sensor_pos_data[0][2].to_sec()
        draw_rect = f % 50 == 0 or additional_boxes_at is not None and f in additional_boxes_at
        if leads is not None:
            #for obj in gt_objs:
            #    obj.classification = 5 if obj.object_id in leads[f] else 0
            for obj in tr_objs:
                obj.classification = 5 if obj.object_id in leads[f] else 0
        #draw_ann(gt_objs, (0, 255, 0), gt_last, draw_rect=draw_rect)
        draw_ann(tr_objs, (0, 0, 255), tr_last, draw_rect=draw_rect)
    viz_sensor(image, sensor_pos_data, s_xy_int, (255, 0, 0))

    cv2.imwrite(filename, image)


def main(args):
    print(F"processing bag files at {args.bags_dir}")

    bags_dir = Path(args.bags_dir)
    bags_base_name = str(bags_dir.name)
    gt_bag_fn = bags_dir / Path(args.gt_bag_prefix + bags_base_name + '.bag')
    if not gt_bag_fn.exists():
        print(f"{gt_bag_fn} does not exists")
        return
    track_bag_fn = bags_dir / Path(args.track_bag_prefix + bags_base_name + '.bag')
    if not track_bag_fn.exists():
        print(f"{track_bag_fn} does not exists")
        return
    raw_bag_fn = bags_dir / Path(args.raw_bag_prefix + bags_base_name + '.bag')
    if not raw_bag_fn.exists():
        print(f"{raw_bag_fn} does not exists")
        return

    with rosbag.Bag(gt_bag_fn) as bag:
        gt_data = list(bag.read_messages(args.gt_topic))

    # gt_data = gt_data[15:17]

    with rosbag.Bag(track_bag_fn) as bag:
        tr_data = list(bag.read_messages(args.track_topic))

    with rosbag.Bag(raw_bag_fn) as bag:
        sensor_pose_data = list(bag.read_messages(args.sensor_pose_topic))

    gt_start_frame, gt_end_frame, tr_start_frame, tr_end_frame = align_data(gt_data, tr_data)
    tr_data = tr_data[tr_start_frame: tr_end_frame]
    gt_data = gt_data[gt_start_frame: gt_end_frame]
    sensor_start_frame, _, _, _ = align_data(gt_data, sensor_pose_data)
    sensor_pose_data = sensor_pose_data[sensor_start_frame:]

    # sensor position sequence
    sensor_tr = [get_tr_from_pose(msg.pose) for (_, msg, t) in sensor_pose_data]
    sensor_pos = [(t.to_sec(), np.dot(sensor_tr[f], np.array([0, 0, 0, 1]).T).T[:3])
                  for f, (_, msg, t) in enumerate(sensor_pose_data)]

    gt_ids, tr_ids = None, None
    leads = None
    additional_boxes_at = None
    if args.lead_vehicle_only:
        print("finding GT intersections with sensor_pos")
        lead_by_gt_frame = compute_lead_vehicle_per_gt_frame(gt_data, sensor_pos)
        print("finding lead vehicles in tracker data")
        gt_data_lead = []
        for f, (topi, msg, t) in enumerate(gt_data):
            msg = copy.deepcopy(msg)
            msg.objects = [obj for obj in msg.objects if obj.object_id == lead_by_gt_frame[f][0]]
            gt_data_lead.append((topi, msg, t))
        tr_content = p_map(generate_tr_json, gt_data_lead, tr_data)

        gt_ids = sorted(list({l[0] for l in lead_by_gt_frame if l[0] > 0}))
        tr_ids = sorted(list({t['objects'][0].object_id for t in tr_content if t['objects']}))

        leads = []
        additional_boxes_at = []
        prev_lead = -1
        for f, (l, t) in enumerate(zip(lead_by_gt_frame, tr_content)):
            if t['objects']:
                leads.append([l[0], t['objects'][0].object_id])
            else:
                leads.append([l[0], -1])
            if l[0] != prev_lead and l[0] > 0:
                additional_boxes_at.append(f)
                prev_lead = l[0]


    # gt_ids, tr_ids = [], [799]

    viz(gt_data, tr_data, sensor_pose_data, filename="viz.png", gt_ids=gt_ids, tr_ids=tr_ids,
        additional_boxes_at=additional_boxes_at, leads=leads)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='visualisation.')
    parser.add_argument('bags_dir', type=str, help='Path to the directory with bag files: GT, Tracking, Raw')
    parser.add_argument('--gt_bag_prefix', type=str, default='labelled_bboxes_pntscnt_',
                        help='gt bag name: prefix + dir name + .bag')
    parser.add_argument('--track_bag_prefix', type=str, default='autonomy_log_pcp_mot_',
                        help='tracking bag name: prefix + dir name + .bag')
    parser.add_argument('--raw_bag_prefix', type=str, default='autonomy_log_for_labelling_',
                        help='raw bag name: prefix + dir name + .bag')
    parser.add_argument('--gt_topic', type=str, default='/ground_truth/deepen/bounding_boxes',
                        help='Ground truth topic with objects lists per time stamp '
                             '(default: /ground_truth/deepen/bounding_boxes)')
    parser.add_argument('--track_topic', type=str, default='/pc_processor/multi_object_tracker/tracked_object_set',
                        help='Track topic with objects lists per time stamp '
                             '(default: /pc_processor/multi_object_tracker/tracked_object_set)')
    parser.add_argument('--sensor_pose_topic', type=str, default='/dynamic_global_pose',
                        help='Raw topic with sensor pose per time stamp '
                             '(default: /dynamic_global_pose)')
    parser.add_argument('--lead_vehicle_only', action='store_true', help='Visualise only lead vehicles')
    main(parser.parse_args())

