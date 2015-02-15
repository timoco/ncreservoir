'''
Created on Aug 22, 2012

@author: xyao
'''
import arcpy
import numpy as np
from arcpy.sa import *
from arcpy import env
import arcgisscripting
import sys
sys.path.append("/water_stor/site-packages/")
sys.path.append("C:\Python27\Lib\site-packages")

import scipy
import scipy.ndimage

novalue = -99

def main():
    dem = arcpy.GetParameterAsText(0)
    x = arcpy.GetParameterAsText(1)
    y = arcpy.GetParameterAsText(2)
    z = arcpy.GetParameterAsText(3)
    dempath = arcpy.GetParameterAsText(4)
    stageflag = arcpy.GetParameterAsText(5)
    
    outwater = dempath+"outputs/"+x+"_"+y+"_"+z
   
    #outwater = dem +"_"+ str(z)
    gp = arcgisscripting.create(10.1)
    

    dem = dempath + dem	
    gp.addmessage("loading dem"+dem)
    lake = arcpy.RasterToNumPyArray(dem,"","","",novalue)

    #
    cellx = arcpy.GetRasterProperties_management(dem, "CELLSIZEX")
    celly = arcpy.GetRasterProperties_management(dem, "CELLSIZEY")
    leftcorner = arcpy.GetRasterProperties_management(dem, "LEFT")
    leftbottom = arcpy.GetRasterProperties_management(dem, "BOTTOM")
    #
    cellx = int(cellx.getOutput(0))
    celly = int(celly.getOutput(0))
    leftcorner = float(leftcorner.getOutput(0))
    leftbottom = float(leftbottom.getOutput(0))
    point = arcpy.Point(leftcorner, leftbottom)
    gp.addmessage(str(leftcorner)+": "+ str(leftbottom))
    #
    row = len(lake)
    col = len(lake[0])
    damx = int(x)
    damy = int(y)
    #
    seed = np.zeros((row, col))
    seed[damx][damy] = 1
    seedem = lake[damx][damy]
    height = int(z)
    height = height + seedem
    gp.addmessage("Seed dem is "+ str(seedem)+ " dam height is "+z+" and dam DEM is"+ str(height))
    #        
    water = lake - height
    np.putmask(water, water >= 0, 0)
    water = abs(water)

    #convert array type as int16(Integer (-32768 to 32767))
    water = np.array(water, dtype=np.int16)

    #
    np.putmask(water, lake == novalue, 0)
    ###   find the isolated pixels and filter out
    ###
    struct = [[1,1,1],[1,1,1],[1,1,1]]
    labelwater, num_water = scipy.ndimage.measurements.label(water, struct)

    #
    label = labelwater[damx][damy]
    np.putmask(labelwater, labelwater != label, 0)

    #    
    gp.addmessage("calculate water surface...")   
    labelwater = np.array(labelwater, dtype=np.int16)
    np.putmask(labelwater, labelwater == label, water)
    np.putmask(labelwater, lake == novalue, novalue)

    #
    gp.addmessage("output water surface...")       
    newRaster = arcpy.NumPyArrayToRaster(labelwater, point, cellx, celly, novalue)
    newRaster.save(outwater)
    #arcpy.MakeRasterLayer_management(newRaster,"water")
   
if __name__ == "__main__":
    main()  
    

