'''
Created on Nov 13, 2012
This version has 
1.stage calculation, 
2.color map with outputs 
3.output file with dem_name_x_y_z in dem folder
4.output volumn and surface area in file
5.convert the point position longitude and latitude as relative position
of array. The longitude and latitude were acquired from UI, and converted
as NAD_1983_StatePlane_North_Carolina_FIPS_3200_Feet position, then combine with
leftcorner and leftbottom to calculate the relative position on the DEM.
Then divided by 20(the cell size) to convert as the point position in the array
which is created from DEM


@author: xyao
'''
import arcpy
import numpy as np
from arcpy.sa import *
from arcpy import env
import arcgisscripting
import sys
import os, glob

sys.path.append("C:\Python27\Lib\site-packages")
env.overwriteOutput = True

import scipy
import scipy.ndimage

novalue = -99
gp = arcpy.env._gp

def main():
    demn = arcpy.GetParameterAsText(0)
    y = arcpy.GetParameterAsText(1)
    x = arcpy.GetParameterAsText(2)
    z = arcpy.GetParameterAsText(3)
    stageflag = arcpy.GetParameterAsText(4)
    outwaterdisplay = arcpy.GetParameterAsText(5)
    sessionid = arcpy.GetParameterAsText(6)
    
    gp.addmessage(demn)
    if len(demn) > 13:
        demname = demn[0:9] + demn[-3:]
        gp.addmessage(demname)
    else:
	demname = demn

    #convert the latitude and longtitude of point as position in the array
    point = arcpy.Point()
    ptGeoms = []
    point.X = float(x)
    point.Y = float(y)
    ptGeoms.append(arcpy.PointGeometry(point))
       
    dempath = "/water_stor/codes/data/" 
    datapath = "/water_stor/agsoutput"
    
    datafolder = datapath +"/" + sessionid + "/" + y + x
    demfolder = datafolder + "z" + z + "/"
    subfolder = os.path.dirname(demfolder)
    if not os.path.exists(subfolder):
        os.makedirs(subfolder)     
             
   
    
    dem = dempath + demname    
    gp.addmessage("loading dem: "+ dem)
    waterRaster = Raster(dem)
    lake = arcpy.RasterToNumPyArray(waterRaster,"","","",novalue)
    
    gp.addmessage("outfile path:"+ demfolder)
    
    #
    cellx = arcpy.GetRasterProperties_management(dem, "CELLSIZEX")
    celly = arcpy.GetRasterProperties_management(dem, "CELLSIZEY")
    leftcorner = arcpy.GetRasterProperties_management(dem, "LEFT")
    leftbottom = arcpy.GetRasterProperties_management(dem, "BOTTOM")
    top = arcpy.GetRasterProperties_management(dem, "TOP")

    wsc = arcpy.Describe(waterRaster)
    wsr = wsc.SpatialReference
   
    
    #
    cellx = int(cellx.getOutput(0))
    celly = int(celly.getOutput(0))
    leftcorner = float(leftcorner.getOutput(0))
    leftbottom = float(leftbottom.getOutput(0))
    top = float(top.getOutput(0))
    arrayY = (top - leftbottom) / 20

    point = arcpy.Point(leftcorner, leftbottom)
    gp.addmessage(str(leftcorner)+": "+ str(leftbottom))
    #
    pt = demfolder+"/point"
    ptshape = pt + ".shp"
    pointshp = arcpy.CopyFeatures_management(ptGeoms,ptshape )
    pointproj = demfolder +"/"+"pointproj" 
    pointproj_shp = pointproj + ".shp"

    # Process: Project
    arcpy.Project_management(pointshp, pointproj_shp, "PROJCS['NAD_1983_StatePlane_North_Carolina_FIPS_3200_Feet',GEOGCS['GCS_North_American_1983',DATUM['D_North_American_1983',SPHEROID['GRS_1980',6378137.0,298.257222101]],PRIMEM['Greenwich',0.0],UNIT['Degree',0.0174532925199433]],PROJECTION['Lambert_Conformal_Conic'],PARAMETER['False_Easting',2000000.002616666],PARAMETER['False_Northing',0.0],PARAMETER['Central_Meridian',-79.0],PARAMETER['Standard_Parallel_1',34.33333333333334],PARAMETER['Standard_Parallel_2',36.16666666666666],PARAMETER['Latitude_Of_Origin',33.75],UNIT['Foot_US',0.3048006096012192]]", "WGS_1984_(ITRF00)_To_NAD_1983", "GEOGCS['GCS_WGS_1984',DATUM['D_WGS_1984',SPHEROID['WGS_1984',6378137.0,298.257223563]],PRIMEM['Greenwich',0.0],UNIT['Degree',0.0174532925199433],METADATA['World',-180.0,-90.0,180.0,90.0,0.0,0.0174532925199433,0.0,1262]]")

    # Process: Add XY Coordinates
    prj = arcpy.AddXY_management(pointproj_shp)
    rows = arcpy.SearchCursor(prj)
    for row in rows:
        px = row.getValue("POINT_X")
        py = row.getValue("POINT_Y")
    
    try:
        ptfile = [pt, pointproj]
        ext = [".shp",".dbf",".sbn",".sbx",".shx",".prj",".shp.xml"]
        for pf in ptfile:
            for e in ext:
                #gp.addmessage(pf+e)
                os.remove(pf+e)       
    except OSError:
        pass
    
    row = len(lake)
    col = len(lake[0])

    gp.addmessage(str(px)+"y"+str(py))
    damx = (px - leftcorner)/20
    damy = (py - leftbottom)/20
    damy = arrayY - damy

    damx = int(damx)
    damy = int(damy)

    damx, damy = damy, damx 	
    gp.addmessage(str(damx)+"y:"+str(damy))	

    #
    seed = np.zeros((row, col))
    seed[damx][damy] = 1
    seedem = lake[damx][damy]
    
    z = int(z)
    #
    stagez = -z

    gp.addmessage("step"+str(stagez)+stageflag)
    
    if stageflag == "true":
        stagez = -10
        gp.addmessage("step"+str(stagez)+stageflag)
    
    
    outdata = datapath +"/" + sessionid  +"/areaVolume.txt"
    f = open(outdata, 'w')
    f.write("position\theight\twater_surface_area(in square feet)\twater_volume(in cubic feet)\n")
    gp.addmessage("write file:" + outdata +":")
    gp.addmessage(f)
    #fdatafake = open(outdatafake, 'w')
    #fdatafake.write("position,\theight,\twater_surface_area(in square feet),\twater_volume(in cubic feet)\n")
    
    areas = []
    volume = []        
    for dz in range(z, 0, stagez):
        height = dz
        # create dem folder to put outputs
        demfolder = datafolder + "z" + str(dz)+"/"
        subfolder = os.path.dirname(demfolder)
        if not os.path.exists(subfolder):
            os.makedirs(subfolder)
                  
        outwater = demfolder + "/dem"
        height = height + seedem
        gp.addmessage("Seed dem is "+ str(seedem)+ " calculate dam from height "+str(z)+" current height:"+ str(height))
        
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
	   
        numwaterCell = long(np.count_nonzero(labelwater))
        areawater = long(numwaterCell*20*20)
        totalheight = long(np.sum(labelwater))
        volumn = long(totalheight *20*20)
        #gp.addmessage("output water volumn and surface area..."+ str(countwater)+"square feet "+str(volumn)+"cubic feet")
        f.write("(" + x + "," + y +")\t"+ str(dz)+ "\t" + str(areawater)+"\t"+str(volumn)+"\n")
        #fdatafake.write("(" + x + "_" + y +"),\t"+ str(dz)+ ",\t" + str(countwater)+",\t"+str(volumn)+"\n")
        areas.append(areawater)
        volume.append(volumn)
    
        np.putmask(labelwater, lake == novalue, novalue)
            #
        gp.addmessage("output water surface...")       
        newRaster = arcpy.NumPyArrayToRaster(labelwater, point, cellx, celly, novalue)
	
    
        try:
           color = "/water_stor/codes/color.clr" 
           gp.addmessage(color)
           arcpy.AddColormap_management(newRaster, "#", color)
        except:
           gp.addmessage("Add Colormap example failed.")
           gp.addmessage(arcpy.GetMessages())
    
        #save the raster as grid format, it only create the folder in the agsoutput, it works fine on the local machine
        newRaster.save(outwater)
        gp.addmessage(outwater)
        if (dz == z):
            gp.addmessage("dz == z")
            newRaster.save(outwaterdisplay)
            arcpy.DefineProjection_management(newRaster, wsr)

	# Execute RasterToASCII
        #outASCII = outwater+".asc"
        #arcpy.RasterToASCII_conversion(newRaster, outASCII)
  
    arcpy.SetParameter(7,areas)
    arcpy.SetParameter(8,volume)
    
    
if __name__ == '__main__':
    main()
