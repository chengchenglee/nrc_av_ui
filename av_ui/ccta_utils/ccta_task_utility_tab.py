#!/usr/bin/env python

from functools import partial
import tkinter as Tkinter 
import tkinter.ttk as tt
from MultiSetDest import MultiSetDest
from MultiSetDest import MULTI_DEST_LIST
import pandas as pd

import os

class MULTI_DEST_TAB():

    def __init__(self, tab):

        self.lbl_multi_dest = Tkinter.Label(tab, text="Set Multi Dest")
        self.lbl_multi_dest.grid(row=1, sticky=Tkinter.W)
        self.multiDestFrame = Tkinter.Frame(tab, width=400, height=50)
        self.multiDestFrame.grid(row=2,columnspan=10, sticky=Tkinter.W)

        self.lbl_multi_dest_repeater = Tkinter.Label(tab, text="Multi Dest Repeater")
        self.lbl_multi_dest_repeater.grid(row=3, sticky=Tkinter.W)
        self.multiDestRepeaterFrame = Tkinter.Frame(tab, width=400, height=50)
        self.multiDestRepeaterFrame.grid(row=4,columnspan=10, sticky=Tkinter.W)

        self.MultiDestList = self.load_mulit_destList(MULTI_DEST_LIST)

    def load_mulit_destList(self, multi_dest_list = None):

        if multi_dest_list is None:
            return []
        
        #load multi-destinations buttons in destinations tab..
        numMultiDestinations = 0
        MultiDestList = []
        for e in multi_dest_list:
            nameIn  = e["name"]
            destsIn = e["dests"]
            MultiDestList.append(MultiSetDest(nameIn, destsIn))
            numMultiDestinations = numMultiDestinations + 1
        
        return MultiDestList

    def create(self):

        self.create_button_for_multi_dest()
        self.create_button_for_multi_dest_repeater()

    def create_button_for_multi_dest(self):
        commandWidth = 7
        #enable multi-destinations buttons in destinations tab..
        multiDestRow = 1
        for d in self.MultiDestList:
            
            d.label = Tkinter.Button(self.multiDestFrame, text=d.multiDestName, width=commandWidth*4, padx=1, relief="raised", command=d.command)
            d.label.grid(column=0, row=multiDestRow, sticky=Tkinter.W+Tkinter.E)
            multiDestRow = multiDestRow + 1

    def create_button_for_multi_dest_repeater(self, json_path=os.path.expanduser('~/projects/nrc_ws/src/nrc_dm/nrc_dm_svcs/scripts/NATCSV_Test_Route.json')):
        commandWidth = 7

        # def get_selected_file_name(file_menu):
        #     filename = file_menu.get()
        #     print("file selected:", os.path.abspath(filename))
        #     # reader = pd.read_excel(filename)  # code to read excel file
        #     # now you can use the `reader` object to get the file data

        # folder = os.path.expanduser('~/projects/nrc_ws/src/nrc_dm/nrc_dm_svcs/scripts')
        # filelist = [fname for fname in os.listdir(folder)]
        # optmenu = tt.Combobox(self.multiDestRepeaterFrame, values=filelist, state='readonly')
        # optmenu.grid(column=0, row=1, sticky=Tkinter.W+Tkinter.E)

        # button_select = Tkinter.Button(self.multiDestRepeaterFrame, text="Read File",
        #                   width=20,  compound=Tkinter.CENTER, command=partial(get_selected_file_name, optmenu))
        
        # button_select.grid(column=1, row=1, sticky=Tkinter.W+Tkinter.E)


        path_text = Tkinter.Label(self.multiDestRepeaterFrame, text=f"{json_path}")
        path_text.grid(column=1, row=2, sticky=Tkinter.W+Tkinter.E)


        temp_button = Tkinter.Button(self.multiDestRepeaterFrame, text = "Dest Repeater is Off", width=commandWidth*4, padx=1, relief="raised")
        temp_button.grid(column=0, row=2, sticky=Tkinter.W+Tkinter.E)
        
        # def start_multi_dest_repeater_node():
        #     os.system("rosrun nrc_dm_svcs multi_set_dest_repeater.py --multi_dest_config_file '~/projects/nrc_ws/src/nrc_dm/nrc_dm_svcs/scripts/NATCSV_Test_Route.json'"+" &")
        
        def switch():
            # Determine is on or off
            if self.button_for_multi_dest_repeater:
                temp_button.config(relief="raised")
                temp_button.config(text = "Dest Repeater is Off", fg = "grey")
                self.button_for_multi_dest_repeater = False
                #stop repeator
                os.system("rosnode kill multi_set_dest_repeater_node")
            else:
                temp_button.config(relief="sunken")
                temp_button.config(text = "Dest Repeater is On", fg = "green")
                self.button_for_multi_dest_repeater = True
                #start the repeator 
                os.system(f"rosrun nrc_dm_svcs multi_set_dest_repeater.py --multi_dest_config_file {json_path}"+" &")
                
        # temp_label = Tkinter.Button(self.multiDestRepeaterFrame, text='MultiDestRepeater', width=commandWidth*4, padx=1, relief="raised", command=start_multi_dest_repeater_node)
        # temp_label.grid(column=0, row=1, sticky=Tkinter.W+Tkinter.E)

        temp_button.config(command = switch)
        self.button_for_multi_dest_repeater = False
        temp_button.config(relief="raised")
        temp_button.config(text = "Dest Repeater is Off", fg = "grey")
