#!/usr/bin/python

import csv, os.path, datetime, itertools, time
from PIL import Image
#from PIL import ImageTk 
#import tkinter as tk
import Tkinter
import ttk

from Tkinter import  Tk, IntVar, StringVar, Label, Button, OptionMenu, Checkbutton
from tkFileDialog import askopenfilename
#from tkinter.messagebox import showinfo
#from tkinter.ttk import *

# button callbacks
from functools import partial


#   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   START DE_GUI FILE    -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   #
csvDir = os.path.join(os.path.expanduser("~"), 'projects/disengagementData/')

global running
def on_closing():
  global running
  print "On closing"
  #if messagebox.askokcancel("Quit","Do you want to quit?"):
  running = False

root = Tkinter.Tk(className='disengagementwindow')
root.title("DisengagementEditor")
root.withdraw()             # Hide root window from Pop-Up
numColumns = 19             # Define column alignment
filename= ''                # Bug fix: reading dialog name

# Change Drivers, Vehicles, or Reports below:
driver_options = ['<No Driver>', 'Chris', 'Thiago', 'Tynan', 'Tomoki']  
report_options = ['<No Rpt Class>', '1', '2', '2A-a', '2A-b', '2A-c', '2B', '3']
vehicle_options = ['<No Vehicle>', 'Bravo', 'Charlie', 'Echo', 'Foxtrot']

def returnState():           # Determine correct file to open
    global sys_date, csv_date

    print("Checking for disengagement report from today.")

    d = datetime.datetime.today()                           # Detect system time object
    sys_year = '{:02d}'.format(int(d.year))                 # Format system datetime
    sys_month = '{:02d}'.format(int(d.month))   
    sys_day = '{:02d}'.format(int(d.day))      
    sys_date = '{}_{}_{}.csv'.format(sys_year, sys_month, sys_day)
    
    sys_date = ''.join(time.strftime("%Y%m%d")+".csv")
    
    try:                                                    # Found "today's" COMPLETED file
        csvFilename = os.path.join(csvDir,'COMPLETED_'+sys_date)
        #csvFilename = os.path.join(csvFilename,sys_date)
        
        print("Checking for: ", csvFilename)
        
        with open(csvFilename, mode = 'r'):
            print("Found completed report from today's date.")
            csv_date = sys_date
            return 'state0'                                 # AutoOpenCOMPLETEDFile

    except IOError:  
        csvFilename = os.path.join(csvDir,sys_date)
        print("Checking for: ", csvFilename)
        try:                                                # Found "today's" NOT COMPLETED file
            print("Checking for todays not-completed file: ", csvFilename)
            with open(csvFilename, mode = 'r'): 
                csv_date = sys_date                                 
                print('Found todays not-completed file.')
                return 'state1'                             # AutoOpenFile

        except IOError:                                     # "Today's" file has NOT been found
            filename = os.path.basename(askopenfilename(filetypes =[('csv files', '*.csv')]))
            if 'COMPLETED_' not in filename:
                csv_date = filename
                completed_file = 'COMPLETED_' + filename
                try:                                        # Found COMPLETED file if user selected NOT COMPLETED
                    with open(completed_file, mode = 'r'):                          
                        return 'state0'                     # dialogOpenCOMPLETEDFile
                        
                except IOError:                             # Open NOT COMPLETED selected file
                    return 'state1'                         # dialogOpenFile
            else:                                           # Open COMPLETED selected file
                csv_date = filename.replace('COMPLETED_', '')
                return 'state0'                             # dialogOpenCOMPLETEDFile

def autoOpenCOMPLETEDFile():
    global r, CSV_data, currentWindow, currentPanel, csv_date

    currentWindow = Tkinter.Toplevel()                      # Window above 'root' creation
    currentPanel = Tkinter.Label(currentWindow)             # Space within Window to place data
    currentPanel.grid()                                     # Place Space in Window
    currentWindow.title('COMPLETED_{}  Disengagement (DE) Report'.format(csv_date))

    csvRawFilename = os.path.join(csvDir,csv_date)
    csvCmpFilename = os.path.join(csvDir,'COMPLETED_'+csv_date)

    with open(csvRawFilename) as rawFile, open(csvCmpFilename) as compFile:
        reader = csv.reader(rawFile)                           # Create object to current open .csv
        comp_reader = csv.reader(compFile)  

        r = 0                                               # Initialize current row

        CSV_data = []                                       # Initialize full data list of current .csv

        checkVar_lst = ['Checked?:']                        # 'Checked?' is added to compensate for column name row[0] in writeToFile()
        driverVar_lst = ['Drivers:']
        reportVar_lst = ['Reports:']
        vehicleVar_lst = ['Vehicle:']
        
        numDataFields = 6
        dataWidth = 6
        flgWidth = 10

        for rawRow, compRow in itertools.izip_longest(reader, comp_reader, fillvalue=''):  # Iterate over the COMPLETED file and the newly updated original                  
            c = 0                                                                       # Initialize current column

            rowTemp = []
            for rawCol, compCol in map(None, rawRow, compRow):
 
                if c < 14:
                  colWidth = flgWidth
                  if c < numDataFields:
                    colWidth = dataWidth
                  label = Tkinter.Label(currentPanel, text = rawCol, width = colWidth, height = 1)
                  label.grid(row = r, column = c)     
                  rowTemp.append(rawCol)
                else:
                  rowTemp.append(compCol)
                      
                c = c+1                                    # Move to next column in the same row
        
            if c==14:
              rowTemp.append(0)
              rowTemp.append(driver_options[0])
              rowTemp.append(report_options[0])
              rowTemp.append(vehicle_options[0])
 
            r += 1                                         # Move to next row                             
            CSV_data.append(rowTemp)
            print(rowTemp)

        organizer(r, CSV_data)
        imageCr8or(r, dataToCSV)
        widgetCr8or(r)
        infoButton(r)
        saveButton(r, checkVar_lst, driverVar_lst, reportVar_lst, vehicleVar_lst, dataToCSV)
        openButton()

def autoOpenFile():          # Auto Open .csv from system datetime and current directory
    global r, CSV_data, currentWindow, currentPanel     

    currentWindow = Tkinter.Toplevel()                  
    currentPanel  = Tkinter.Label(currentWindow)             
    currentPanel.grid()    
    currentWindow.title('{}  Disengagement (DE) Report'.format(csv_date))                        

    filename = os.path.join(csvDir, csv_date)

    with open(filename, 'rb') as file:
        reader = csv.reader(file) 
        r = 0                                       
        CSV_data = []
        
        numDataFields = 6
        dataWidth = 6
        flgWidth = 10

        for row in reader:                          
            c = 0
            print row

            for col in row:
                colWidth = flgWidth
                if c < numDataFields:
                  colWidth = dataWidth
                label = Tkinter.Label(currentPanel, text = col, width = colWidth, height = 1)
                label.grid(row = r, column = c)                
                c += 1

            r += 1    
            
            rowTemp = row
            # Append default data
            rowTemp.append(0)
            rowTemp.append(driver_options[0])
            rowTemp.append(report_options[0])
            rowTemp.append(vehicle_options[0])
            CSV_data.append(rowTemp)

        print CSV_data
        organizer(r, CSV_data)
        imageCr8or(r, dataToCSV)
        widgetCr8or(r)
        infoButton(r)
        saveButton(r, checkVar_lst, driverVar_lst, reportVar_lst, vehicleVar_lst, dataToCSV)
        openButton()
        print('Done opening disengagement file.')

def openFileViaButton():
    global r, CSV_data, currentWindow, currentPanel, csv_date 

    filename = os.path.basename(askopenfilename(filetypes =[('csv files', '*.csv')]))
    
    if filename == '':                      # If 'cancel' is pressed
        pass

    else:
        currentWindow.destroy()             # Close current window

        if 'COMPLETED_' not in filename:
            csv_date = filename
            completed_file = 'COMPLETED_' + csv_date
            try:                                       
                with open(completed_file, mode = 'r'):                          
                    return_status = 'state2'                     
                    
            except IOError:                             
                return_status = 'state3'
                print(return_status)                         
        else:                                           
            csv_date = filename.replace('COMPLETED_', '')
            return_status = 'state2'                             
        
        if return_status == 'state2':
            autoOpenCOMPLETEDFile()
        if return_status == 'state3':
            autoOpenFile()
        
def openButton():
    open_button = Button(currentPanel, text='Open .csv', command=lambda: openFileViaButton())
    open_button.grid(row=0, column=numColumns+1)

def infoPop():
    print('Open info window')
    infoWin = Tkinter.Toplevel() 
    infoWin.wm_title('Disengagement ID Information')
    info = """    [1]  AV system fails and requires driver to take over (ex. software crashs)
    [2]  AV system does not recognize failure but driver take over for safety
    [2A-a]  AV is about to collide with another vehicle or obstacle due to self steering
    [2A-b]  AV is about to rear end of another vehicle due to insufficient deceleration 
    [2A-c]  Another vehicle is about to rear end of AV due to sudden deceleration by AV
    [2B]  AV driver is expecting a failure and can easily handle the disengagement ( typical during early development )
    [3] AV stops due to end of experiment"""
    panel = Tkinter.Label(infoWin, text = info) 
    panel.grid()     

def infoButton(r):
    info_button = Tkinter.Button(currentPanel, text = 'ID INFO HERE(i)', command = infoPop)
    info_button.grid(row = r, column=17)

def organizer(r, CSV_data):   # Format data for widgets
    global dataToCSV
    dataToCSV = [CSV_data[x:x+numColumns] for x in range(0, len(CSV_data), numColumns)]     # Format data into sub lists

def imageView(r, selected_img, dataToCSV):
    global CSV_data
    year   = '{:02d}'.format(int((CSV_data[r])[0]))
    month  = '{:02d}'.format(int((CSV_data[r])[1]))  # Format row[i] date with front 0 
    day    = '{:02d}'.format(int((CSV_data[r])[2]))     
    hour   = '{:02d}'.format(int((CSV_data[r])[3]))    
    minute = '{:02d}'.format(int((CSV_data[r])[4]))  
    sec    = '{:02d}'.format(int((CSV_data[r])[5]))
    selected_img = ("{}_{}_{}_{}_{}_{}.jpg").format(year, month, day, hour, minute, sec)
    
    selected_img = os.path.join(csvDir,selected_img)
    
    print("Looking for image: ", selected_img)

    if os.path.exists(selected_img) == False:
        print("Image not found: ", selected_img)

    else:
        img = Image.open(selected_img) 
        img.thumbnail((800,800), Image.ANTIALIAS)   # Image resize, aspect r, and filter
    
        img = ImageTk.PhotoImage(img) 

        win = Tkinter.Toplevel()                    # Create root window for Image only
        win.wm_title(selected_img)                  # Create window title based on row[i] dates
 
        panel = Tkinter.Label(win, image = img)     
        panel.image = img                   
        panel.grid(column = numColumns+1) 

def imageCr8or(r, selected_img):
    global dataToCSV
    image_button_functions = []

    for i in range (1, r):
        def image_button(i=i):
            img_button = Button(currentPanel, text = "View Image", command = lambda: imageView(i, selected_img, dataToCSV))
            img_button.grid(row = i, column=14)
            return image_button
        image_button_functions.append(image_button(i))

def checkBoxUpdated(row,checkVar):
    (CSV_data[row])[14] = checkVar.get()
    print("update checkbox: ",row," to ",checkVar.get())
    print(CSV_data[row])
    
def driverUpdated(row, driverStr):
    (CSV_data[row])[15] = driverStr
    print("update driver: ",row," to ",driverStr)
    print(CSV_data[row])
    
def disengagementClassUpdated(row,classStr):
    (CSV_data[row])[16] = classStr
    print("update class: ",row," to ",classStr)
    print(CSV_data[row])
    
def vehicleUpdated(vehicleStr):
    (CSV_data[1])[17] = vehicleStr
    print("update vehicle to ",vehicleStr)
    print(CSV_data[1])

def widgetCr8or(r):           # Checkbutton, Driver Name, ReporttoDMV DE ID 
    global checkVar_lst, driverVar_lst, reportVar_lst, vehicleVar_lst

    checkVar_lst = ['Checked?:']                           
    driverVar_lst = ['Drivers:']
    reportVar_lst = ['Reports:']
    vehicleVar_lst = ['Vehicle:']

    vehicleVar = Tkinter.StringVar(currentPanel)
    vehicleVar.set((CSV_data[1])[17])
    w = OptionMenu(currentPanel, vehicleVar, *vehicle_options, command=vehicleUpdated)
    w.grid(row=1, column = 18)
    vehicleVar_lst.append(vehicleVar)

    for i in range (1, r):
        checkVar = IntVar()
        checkVar.set((CSV_data[i])[14])
        #checkVar_lst.append(checkVar)
        Checkbutton(currentPanel, text = '', variable = checkVar, command=partial(checkBoxUpdated,i,checkVar)).grid(row = i, column = 15)

        driverVar = Tkinter.StringVar(currentPanel)
        driverVar.set((CSV_data[i])[15])
        #driverVar_lst.append(driverVar)
        w = OptionMenu(currentPanel, driverVar, *driver_options, command=partial(driverUpdated,i))
        w.grid(row=i, column=16)

        reportVar = Tkinter.StringVar(currentPanel)
        reportVar.set((CSV_data[i])[16])
        #reportVar_lst.append(reportVar)
        w = OptionMenu(currentPanel, reportVar, *report_options, command=partial(disengagementClassUpdated,i))
        w.grid(row=i, column=17)

def writeToFile(r, checkVar_lst, driverVar_lst, reportVar_lst, vehicleVar_lst, dataToCSV):
    check_file_completion = 0

    for i in range(1, r):
        #try:
        #    (CSV_data[i])[15] = checkVar_lst[i].get()
        #    (CSV_data[i])[16] = driverVar_lst[i].get()
        #    (CSV_data[i])[17] = reportVar_lst[i].get()
        #    (CSV_data[1])[18] = vehicleVar_lst[1].get()
        #except AttributeError:
        #    pass
    
        if '<No Selection>' in CSV_data[i] or CSV_data[i][15] == 0:
            print("Warning! Row {}".format(i), "Row {} is incomplete. Please complete and re-save.".format(i))
            check_file_completion = 1

    if check_file_completion == 0:
        csvFilename = os.path.join(csvDir,'COMPLETED_'+csv_date)
        with open(csvFilename, mode = 'w') as newFile:
            writer = csv.writer(newFile) #, quoting=csv.QUOTE_ALL)     # Writing to .csv objection creation with new file
            writer.writerows(CSV_data)                             # Write data from current .csv
            
            print("Saved", "Changes made to the .csv file have beeen saved!") 

def saveButton(r, checkVar_lst, driverVar_lst, reportVar_lst, vehicleVar_lst, dataToCSV):
    submitb = Button(currentPanel, text='Save All', command=lambda: writeToFile(r, checkVar_lst, driverVar_lst, reportVar_lst, vehicleVar_lst, dataToCSV))
    submitb.grid(row=0, column=numColumns-1)

return_status = returnState()

if return_status == 'state0':
    autoOpenCOMPLETEDFile()
if return_status == 'state1':
    autoOpenFile()

#root.mainloop()
root.protocol("WM_DELETE_WINDOW", on_closing)
root.update_idletasks()
root.update()

running = True
while running:
  # Update gui
  root.update_idletasks()
  root.update()
  
  print('Waiting.')
  time.sleep(0.2)
  
root.quit()
#   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   END DE_GUI FILE    -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   -   #
