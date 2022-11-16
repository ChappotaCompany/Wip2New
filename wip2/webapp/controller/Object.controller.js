sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "../model/formatter",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    'sap/ui/core/Fragment',
    'sap/ui/Device',
    'sap/ui/model/Sorter',
    'sap/m/TablePersoController',
    'sap/m/library',
    './DemoPersoService',
    "sap/ui/core/util/Export",
    "sap/ui/core/util/ExportTypeCSV",
    "sap/ui/core/format/DateFormat",
    'sap/m/Token'

], function (BaseController, JSONModel, History, formatter,
    Filter, FilterOperator, MessageToast, MessageBox, Fragment, Device, Sorter, TablePersoController, mlibrary, DemoPersoService, Export, ExportTypeCSV, DateFormat, Token) {
    "use strict";
    var ResetAllMode = mlibrary.ResetAllMode;
    return BaseController.extend("com.chappota.wippoc2.wipproject2.wip2.controller.Object", {
        formatter: formatter,
        /* =========================================================== */
        /* lifecycle methods     - On Init                             */
        /* =========================================================== */
        onInit: function () {
            this._mViewSettingsDialogs = {};
            this.oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this.oRouter.getRoute("object").attachPatternMatched(this._getwipprojectdata, this);
            this.multilabel = "<Multiple Values>";
            // this.StatusName = "";

            this._oTPC = new TablePersoController({
                table: this.byId("wiptable"),
                //specify the first part of persistence ids e.g. 'demoApp-productsTable-dimensionsCol'
                componentName: "demoApp",
                resetAllMode: ResetAllMode.ServiceReset,
                persoService: DemoPersoService
            }).activate();



        },
        /* =========================================================== */
        /* Method called when the first time screen is rendered        */
        /* =========================================================== */
        _tableDataReusable() {
            //Data Definitions
            var oTable = this.byId("wiptable");
            oTable.setBusy(true);
            const pid = this.pid, cc = this.compcode,
                jrnlentrymdl = this.getOwnerComponent().getModel("jrnlentryMDL"),
                wipeditsmdl = this.getOwnerComponent().getModel("wipeditsMDL"),
                compcodefilter = new Filter("CompanyCode", FilterOperator.EQ, cc),
                projectfilter = new Filter("Project", FilterOperator.EQ, pid);

            const wipprojlist = this.getOwnerComponent().getModel(),

                engagementProjectFilter = new Filter("ProjectID", FilterOperator.EQ, pid);
            wipprojlist.read("/ProjectSet", {
                filters: [engagementProjectFilter],
                success: (odata) => {
                    var wipprojjson = new JSONModel();
                    wipprojjson.setData(odata.results[0]);
                    this.getView().setModel(wipprojjson, "prjlst");
                },
                error: (err) => {
                    MessageToast.show(err);
                }
            });
            //*********************/
            //Step 1: Read S/4 Journal Entries for the project
            //*********************/
            jrnlentrymdl.read("/YY1_JournalEntryItem", {
                filters: [projectfilter, compcodefilter],
                success: function (odata) {

                    if (odata.results[0] !== undefined) {
                        this.personalnumber = odata.results[0].PersonnelNumber;
                    }
                    //set the data received from the read from S/4 to jsonmodel
                    var jsonmodelmainjrnlentry = new JSONModel();
                    jsonmodelmainjrnlentry.setData(odata.results);
                    //*********************/
                    //Step 2: Read WIP Edit for the Project
                    //*********************/
                    var projidfilter = new Filter("ProjectID", FilterOperator.EQ, pid);
                    wipeditsmdl.read("/YY1_WIPEDITS", {
                        filters: [projidfilter],
                        success: function (odata2) {
                            oTable.setBusy(false);

                            var jsonmodelwipedit = new JSONModel();
                            jsonmodelwipedit.setData(odata2.results);
                            var changedflag = 0,
                                newFlag = 0,
                                updateflag = 0;
                            //Compare and populate from Journal Entry Table and WIP Edit

                            for (var i = 0; i < odata.results.length; i++) {
                                for (var j = 0; j < odata2.results.length; j++) {
                                    if (odata.results[i].AccountingDocument === jsonmodelwipedit.oData[j].JEID) {
                                         
                              

                                        if (jsonmodelwipedit.oData[j].Status === "02") {
                                          
                                            odata.results[i].Status = "Updated";
                                            odata.results[i].StatusObject = "Error";
                                            odata.results[i].StatusIcon = 'sap-icon://edit';
                                        } else if (jsonmodelwipedit.oData[j].Status === "03") {
                                            odata.results[i].Status = "Deleted";
                                            odata.results[i].StatusObject = "None";
                                            odata.results[i].StatusIcon = 'sap-icon://delete';
                                        } 
                                        else
                                        
                                        if (jsonmodelwipedit.oData[j].Status === "10") {


                                                odata.results.splice(i, 1);
                                                jsonmodelwipedit.refresh();

                                                break;

                                            }

                                            // else {
                                            //     odata.results[i].Status = "Original";
                                            //     odata.results[i].StatusObject = "None";
                                            //     odata.results[i].StatusIcon = 'sap-icon://edit';
                                            // }
                                        odata.results[i].AccountingDocument = jsonmodelwipedit.oData[j].JEID;
                                        odata.results[i].Quantity = jsonmodelwipedit.oData[j].Quantity;
                                        odata.results[i].WBSElement = jsonmodelwipedit.oData[j].WBS;
                                        odata.results[i].DocumentItemText = jsonmodelwipedit.oData[j].Notes;
                                        odata.results[i].OriginCostCtrActivityType = jsonmodelwipedit.oData[j].ActivityType;
                                        odata.results[i].ServicesRenderedDate = jsonmodelwipedit.oData[j].ServiceDate;
                                        odata.results[i].PersonnelNumber = jsonmodelwipedit.oData[j].EmployeeID;
                                        changedflag++;
                                    }

                                }
                            }


                            //Populate the new records
                            for (var j = 0; j < odata2.results.length; j++) {

                                if ((jsonmodelwipedit.oData[j].Status === "01")) {
                                    odata.results[odata.results.length] = {}
                                    odata.results[odata.results.length - 1].AccountingDocument = jsonmodelwipedit.oData[j].JEID;
                                    odata.results[odata.results.length - 1].Project = jsonmodelwipedit.oData[j].ProjectID;
                                    odata.results[odata.results.length - 1].DocumentItemText = jsonmodelwipedit.oData[j].Notes;
                                    odata.results[odata.results.length - 1].WBSElement = jsonmodelwipedit.oData[j].WBS;
                                    odata.results[odata.results.length - 1].Quantity = jsonmodelwipedit.oData[j].Quantity;
                                    odata.results[odata.results.length - 1].OriginCostCtrActivityType = jsonmodelwipedit.oData[j].ActivityType;
                                    odata.results[odata.results.length - 1].ServicesRenderedDate = jsonmodelwipedit.oData[j].ServiceDate;
                                    odata.results[odata.results.length - 1].PersonnelNumber = jsonmodelwipedit.oData[j].EmployeeID; //this.personalnumber;
                                    odata.results[odata.results.length - 1].GLAccount = "<New>";
                                    odata.results[odata.results.length - 1].ReferenceDocument = "<New>";
                                    odata.results[odata.results.length - 1].AmountInGlobalCurrency = "<New>";
                                    odata.results[odata.results.length - 1].Status = "New";
                                    odata.results[odata.results.length - 1].StatusObject = "Information";
                                    odata.results[odata.results.length - 1].StatusIcon = 'sap-icon://notes';
                                    odata.results[odata.results.length - 1].Customer = this.custid;
                                    newFlag++;
                                }
                            }

                            var changedjson = new JSONModel();
                            changedjson.setData(changedflag);
                            this.getView().setModel(changedjson, "changedcount");

                            var newcount = newFlag;
                            var newjson = new JSONModel();
                            newjson.setData(newcount);
                            this.getView().setModel(newjson, "newcount");

                            var orignal = odata.results.length - newcount - changedflag;
                            var orignaljson = new JSONModel();
                            orignaljson.setData(orignal);
                            this.getView().setModel(orignaljson, "orignal");

                            var count = new JSONModel();
                            count.setData(odata.results.length);
                            this.getView().setModel(count, "count1");

                            this.getView().byId("wiptable").setModel(jsonmodelmainjrnlentry, "wipentry");


                            this._readyToBillTableData();




                        }.bind(this),
                        error: function (msg2) {
                            oTable.setBusy(false);

                        }.bind(this)
                    });
                }.bind(this),
                error: function (msg) {
                    oTable.setBusy(false);
                }.bind(this)
            });
        },
        /* =========================================================== */
        /* Method to show the notes popover for WIP                     */
        /* =========================================================== */
        _notespopover: function (oEvent) {
            var oButton = oEvent.getSource(),
                notes = oEvent.getSource().getBindingContext("wipentry").getProperty("DocumentItemText"),
                oView = this.getView();

            if (!this.noteslink) {
                this.noteslink = sap.ui.xmlfragment(this.getView().getId(), "com.chappota.wippoc2.wipproject2.wip2.fragments.S2_NotesPopover", this);
                oView.addDependent(this.noteslink);

            }
            this.byId("popovernotes").setText(notes);
            this.byId("popovernotes1").setPlacement(sap.m.PlacementType.Left);
            this.noteslink.openBy(oButton);
        },
         /* =========================================================== */
        /* Method to show the notes popover  for Ready To Bill          */
        /* =========================================================== */
        _notespopoverrtb : function (oEvent) {
            var oButton = oEvent.getSource(),
                notes = oEvent.getSource().getBindingContext("rtobill").getProperty("Notes"),
                oView = this.getView();

            if (!this.noteslink) {
                this.noteslink = sap.ui.xmlfragment(this.getView().getId(), "com.chappota.wippoc2.wipproject2.wip2.fragments.S2_NotesPopover", this);
                oView.addDependent(this.noteslink);

            }
            this.byId("popovernotes").setText(notes);
            this.byId("popovernotes1").setPlacement(sap.m.PlacementType.Left);
            this.noteslink.openBy(oButton);
        },

        /* =========================================================== */
        /* Method to refresh WIP Table                                 */
        /* =========================================================== */
        _refreshWipTable: function () {
            this.byId("suggestionhelpbox").setValue();
            this._getwipprojectdata();
        },
        /* =========================================================== */
        /* Method:                                                     */
        /* =========================================================== */
        _getwipprojectdata: function (oevent) {
            if (oevent !== undefined) {
                this.pid = oevent.getParameter("arguments").pid;
                this.custid = oevent.getParameter("arguments").custid;
                this.compcode = oevent.getParameter("arguments").orgid;
            }
            this._tableDataReusable();
        },
        /* =========================================================== */
        /* Method:        */
        /* =========================================================== */
        onSuggestionItemSelected: function (oevent) {
            var oSelectedRow = oevent.getParameter("selectedRow").getBindingContext("wipentry").getObject();
            var jsonarray = [];
            var owndata = {
                Status: oSelectedRow.Status,
                StatusIcon: oSelectedRow.StatusIcon,
                StatusObject: oSelectedRow.StatusObject,
                AccountingDocument: oSelectedRow.AccountingDocument,
                GLAccount: oSelectedRow.GLAccount,
                ReferenceDocument: oSelectedRow.ReferenceDocument,
                Customer: oSelectedRow.Customer,
                Project: oSelectedRow.Project,
                Quantity: oSelectedRow.Quantity,
                WorkItem: oSelectedRow.WorkItem,
                WBSElement: oSelectedRow.WBSElement,
                AmountInGlobalCurrency: oSelectedRow.AmountInGlobalCurrency,
                PersonnelNumber: oSelectedRow.PersonnelNumber,
                ServicesRenderedDate: this.formatter.dateTime(oSelectedRow.ServicesRenderedDate),
                DocumentItemText: oSelectedRow.DocumentItemText
            };
            jsonarray.push(owndata);
            var jsonmodel = new JSONModel();
            jsonmodel.setData(jsonarray);
            this.getView().byId("wiptable").setModel(jsonmodel, "wipentry");
        },
        /* =========================================================== */
        /* Method:        */
        /* =========================================================== */
        _searchaccdoc: function (oevent) {
            var xfilter = [];
            var filterproj = new Filter("Project", FilterOperator.EQ, this.pid);
            var filterwip = new Filter("AccountingDocument", FilterOperator.EQ, oevent.getParameter("value"));
            xfilter.push(filterproj);
            xfilter.push(filterwip);
            var finalfilter = new Filter({ filters: xfilter, and: true });
            var bindings = this.getView().byId("wiptable").getBinding("items");
            bindings.filter([finalfilter]);
        },
        /* =========================================================== */
        /* Method Trigggerd when the "New" button is clicked.          */
        /* =========================================================== */
        _createjeRecord: function (oevent) {
            if (!this.nDialog) {
                this.nDialog = sap.ui.xmlfragment(this.getView().getId(), "com.chappota.wippoc2.wipproject2.wip2.fragments.S2_New_WIP", this);
                this.getView().addDependent(this.nDialog);
            }
            this.nDialog.open();
            var unbilled = this.byId("newunbilled").getValue();
            var notes = this.byId("newnotes").getValue();
            var acttype = this.byId("newacttype").getValue();
            this.byId("newprnr").setValue(this.prnr);
            this.getView().byId("newservicedate").setValue(this.formatter.dateTime(new Date()));
            this.byId("newcustomerid2").setValue(this.custid);
            if (unbilled !== "") {
                this.byId("newunbilled").setValue();
            }
            if (notes !== "") {
                this.byId("newnotes").setValue();
            }
        },
        _closenewrecord: function () {
            this.nDialog.close();
            this.byId("wiptable").removeSelections();
        },
        /* =========================================================== */
        /* Method to Save new record - when hitting "Save" in the new popup box*/
        /* =========================================================== */
        _savenewrecord: function () {
            var wipeditsmdl = this.getOwnerComponent().getModel("wipeditsMDL");

            console.log("in save");

            var d = new Date(this.getView().byId("newservicedate").getValue());
            var formateddate = d.toJSON().substring(0, 19);

            //Read the top record ID
            wipeditsmdl.read("/YY1_WIPEDITS", {
                urlParameters: {
                    "$select": 'JEID',
                    "$orderby": 'JEID desc',
                    "$top": 1
                },
                success: (odata2) => {
                    var jsonmodelwipedit = new JSONModel();
                    jsonmodelwipedit.setData(odata2.results);
                    var jeid = parseInt(odata2.results[0].JEID);
                    var newpayload = {
                        JEID: (jeid + 1).toString(),
                        ID: "1",
                        Status: "01",
                        ProjectID: this.byId("newprojectid").getValue(),
                        Quantity: this.getView().byId("newunbilled").getValue(),
                        WBS: this.getView().byId("newworkpackage").getValue(),
                        Notes: this.getView().byId("newnotes").getValue(),
                        EmployeeID: this.getView().byId("newprnr").getValue(),
                        ActivityType: this.getView().byId("newacttype").getValue(),
                        ServiceDate: formateddate
                    };
                    var saveapi = this.getOwnerComponent().getModel("wipeditsMDL");
                    saveapi.create("/YY1_WIPEDITS", newpayload, {
                        success: (odata) => {
                            MessageToast.show("Record Created");
                            // this.onInit();
                            this.nDialog.close();
                            this._getwipprojectdata();
                        },
                        error: (err) => {
                            MessageToast.show(err);
                            this.nDialog.close();
                        }
                    });
                },
                error: (err) => {
                    MessageToast.show(err);
                }
            });
        },
        /* =========================================================== */
        /* Method called when Saving the edited records (for both Single and Multi select)        */
        /* =========================================================== */
        _saveeditjerecord: function () {

            console.log("Saveitjerecord called!!!");
            var oTable = this.getView().byId("wiptable");
            //var nvalue =	oTable.getItems()[i].getCells()[i].getText();  
            var selectedItems = oTable._aSelectedPaths;
            var updatedcount = 0, originalcount = 0;
            var jemap = new Map();
            if (selectedItems.length > 1) jemap.set("Multi", true); else jemap.set("Multi", false);
            for (var i = 0; i < selectedItems.length; i++) {
                var ind = selectedItems[i].slice(1);
                for (var j = 0; j < oTable.getColumns().length; j++) {
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_chngind")) var status = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_jeid")) var jeid = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_unbqty")) var unbqty = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_wrkpckg")) var wrkpkg = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_notes")) var notes = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_acttype")) var actype = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_prnr")) var prnr = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_srvcrenddate")) var servdate = oTable.getItems()[ind].getCells()[j].getText();

                }

                //Perform an update, if it has already been updated or created
                jemap.set(jeid, ind);
                if ((status === 'Updated') || (status === 'New')) {
                    //if(status === 'Updated') amultistat = "02"; else amultistat = "01";
                    var editapi = this.getOwnerComponent().getModel("wipeditsMDL");
                    var filterjeid = new Filter("JEID", FilterOperator.EQ, jeid);
                    editapi.read("/YY1_WIPEDITS", {
                        filters: [filterjeid],
                        success: (odata) => {
                            var index = jemap.get(odata.results[0].JEID);
                            var amultiqty = this.getView().byId("editrightunbilamnt").getValue();
                            var amultiwbs = this.getView().byId("editrightwpkg").getValue();
                            var amultinotes = this.getView().byId("editrightnotes").getValue();
                            var amultiacttype = this.getView().byId("editrightacttype").getValue();
                            var amultiprnr = this.getView().byId("editrightprnr").getValue();
                            var amultisrvdate = this.getView().byId("editrightservdate").getValue();
                            var lstatus = status;
                            var amultistat;
                            var jsondate;
                            var selectedItems = oTable._aSelectedPaths;
                            if (lstatus === 'Updated') amultistat = "02"; else amultistat = "01";
                            if (jemap.get("Multi")) {
                                if (amultiqty === '') {
                                    // amultiqty = oTable.getItems()[index].getCells()[7].getText();
                                    amultiqty = unbqty;
                                }
                                if (amultiwbs === '') {
                                    //amultiwbs = oTable.getItems()[index].getCells()[8].getText();
                                    amultiwbs = wrkpkg;
                                }
                                if (amultinotes === '') {
                                    // amultinotes = oTable.getItems()[index].getCells()[13].getText();
                                    amultinotes = notes;
                                }
                                if (amultiacttype === '') {
                                    //amultiacttype = oTable.getItems()[index].getCells()[10].getText();
                                    amultiacttype = actype;
                                }
                                if (amultiprnr === '') {
                                    //amultiprnr = oTable.getItems()[index].getCells()[11].getText();
                                    amultiprnr = prnr;
                                }
                                if (amultisrvdate === '') {
                                    //amultisrvdate = oTable.getItems()[index].getCells()[12].getText();
                                    amultisrvdate = servdate;
                                }
                            }
                            //jsondate = amultisrvdate.toJSON();            
                            var esetguid = odata.results[0].SAP_UUID;
                            var editpayload = {
                                Status: amultistat,
                                ID: "1",
                                ProjectID: this.byId("editrightprojectid").getValue(),
                                Quantity: amultiqty,
                                WBS: amultiwbs,
                                Notes: amultinotes,
                                ActivityType: amultiacttype,
                                EmployeeID: amultiprnr,
                                ServiceDate: this.formatter.dateTimebackendwithtime(amultisrvdate)
                            };
                            var editapi = this.getOwnerComponent().getModel("wipeditsMDL");

                            var esetwithguid = "/YY1_WIPEDITS(guid'" + esetguid + "')";
                            editapi.update(esetwithguid, editpayload, {
                                success: (odata) => {
                                    console.log("Inside success - for Updated/New");
                                    MessageToast.show("Updated!");
                                    this._getwipprojectdata();
                                    this.pDialog.close();
                                    updatedcount++;
                                },
                                error: (err) => {
                                    MessageToast.show(err);
                                    this.pDialog.close();
                                    //this.byId("wiptable").removeSelections();
                                }
                            });

                        },
                        error: (err) => {
                            MessageToast.show(err);
                            this.pDialog.close();
                            //this.byId("wiptable").removeSelections();
                        }
                    });
                } else if (status === 'Original') {
                    //If multiple values are being edited
                    var amultiqty = this.getView().byId("editrightunbilamnt").getValue();
                    var amultiwbs = this.getView().byId("editrightwpkg").getValue();
                    var amultinotes = this.getView().byId("editrightnotes").getValue();
                    var amultiacttype = this.getView().byId("editrightacttype").getValue();
                    var amultiprnr = this.getView().byId("editrightprnr").getValue();
                    var amultisrvdate = this.getView().byId("editrightservdate").getValue();

                    if (jemap.get("Multi")) {
                        if (amultiqty === '') {
                            amultiqty = unbqty;
                        }
                        if (amultiwbs === '') {
                            amultiwbs = wrkpkg;
                        }
                        if (amultinotes === '') {
                            amultinotes = notes;
                        }
                        if (amultiacttype === '') {
                            amultiacttype = actype;
                        }
                        if (amultiprnr === '') {
                            amultiprnr = prnr;
                        }
                        if (amultisrvdate === '') {
                            amultisrvdate = servdate;
                        }
                    }
                    var editpayload = {
                        JEID: jeid,
                        Status: "02",
                        ID: "1",
                        ProjectID: this.byId("editrightprojectid").getValue(),
                        Quantity: amultiqty,
                        WBS: amultiwbs,
                        Notes: amultinotes,
                        ActivityType: amultiacttype,
                        EmployeeID: amultiprnr,
                        ServiceDate: this.formatter.dateTimebackendwithtime(amultisrvdate)
                    };
                    
                    var saveeditapi = this.getOwnerComponent().getModel("wipeditsMDL");
               
                    saveeditapi.create("/YY1_WIPEDITS", editpayload, {
                      
                      
                        success: (odata) => {
                            console.log("Inside success - for Original");
                            // MessageToast.show("Record Created");
                            // this.onInit();
                            this.pDialog.close();
                            this._getwipprojectdata();
                            originalcount++;
                        },
                        error: (err) => {
                            MessageToast.show(err);
                            this.pDialog.close();
                            //this.byId("wiptable").removeSelections();
                        }
                    });
                }
            }
            //jemap.clear();

            //var totalupdated = updatedcount + originalcount;
            //MessageBox.alert("Total number of records updated : " + totalupdated);
            this.pDialog.close();
            this.byId("wiptable").removeSelections();
        },
        /****
        * Method to Finalize the record
        */
        _finalizeRecord: function (oevent) {
            console.log("finalizerecord called!!!");
            var oTable = this.getView().byId("wiptable");
            //var nvalue =	oTable.getItems()[i].getCells()[i].getText();  
            var selectedItems = oTable._aSelectedPaths;
            var updatedcount = 0, originalcount = 0;

            for (var i = 0; i < selectedItems.length; i++) {
                var ind = selectedItems[i].slice(1);
                for (var j = 0; j < oTable.getColumns().length; j++) {
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_chngind")) var status = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_jeid")) var jeid = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_unbqty")) var unbqty = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_wrkpckg")) var wrkpkg = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_notes")) var notes = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_acttype")) var actype = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_prnr")) var prnr = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_srvcrenddate")) var servdate = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_ref")) var timesheetidref = oTable.getItems()[ind].getCells()[j].getText();

                }
                var status = status;
                var jeid = jeid;
                var timesheetid = timesheetidref;
                var timesheetstatus;
                var mode;
                if (status === "Updated" || status === "Deleted") {
                    if (status === "Updated") mode = "U"; else mode = "D";
                    timesheetid = timesheetid.padStart(12, '0');
                    timesheetstatus = "30";
                } else if (status === "New") {
                    mode = 'C';
                    timesheetid = "";
                    timesheetstatus = "30";
                }
                //Create the required payload
                var finalRecordPayload = {
                    "TimeSheetDataFields": {
                        "ControllingArea": "A000", // (Hard Code)
                        //"SenderCostCenter": "1720P001", // (Hard code)
                        "ActivityType": actype,//"T001", //this.acttype, // (From the record – “Activity Type”)
                        "WBSElement": wrkpkg, // (From the record – “WBS Element”)
                        "RecordedHours": unbqty, // (From the record – “Unbilled Quantity”)
                        "RecordedQuantity": unbqty, // (From the record – “Unbilled Quantity”)
                        "HoursUnitOfMeasure": "H", // (Hard Code)
                        "TimeSheetNote": notes
                    },
                    "CompanyCode": "1720", // (Hard Code)
                    //"PersonWorkAgreementExternalID": personalextid,
                    "PersonWorkAgreement": prnr, // (Optional, Will be included in the Screen 2 API)
                    "TimeSheetRecord": timesheetid,
                    "TimeSheetDate": this.formatter.dateTimebackendwithtime(servdate), // (From the record – “Timesheet date”)
                    "TimeSheetIsReleasedOnSave": true, // (Hard Code)
                    "TimeSheetStatus": timesheetstatus, // (Hard Code)
                    "TimeSheetOperation": mode // (Use “C” for new, “U” for Edited and “D” for deleted)
                };

                if (status === 'New') {
                    var wipsaves = this.getOwnerComponent().getModel("wipsavesMDL");
                    wipsaves.create("/TimeSheetEntryCollection", finalRecordPayload, {
                        success: (odata) => {
                            this._deleteWIPEdit(jeid);
                            //this._getwipprojectdata();
                            MessageToast.show("Record posted");
                            this.byId("wiptable").removeSelections();

                        },
                        error: (err) => {
                            MessageToast.show(err);
                            this.byId("wiptable").removeSelections();
                        }
                    });
                }
                if (status === 'Updated' || status === 'Deleted') {
                    var wipsaves = this.getOwnerComponent().getModel("wipsavesMDL");
                    var wipwithaied = "/TimeSheetEntryCollection";
                    wipsaves.create(wipwithaied, finalRecordPayload, {
                        success: (odata) => {
                            this._deleteWIPEdit(jeid);
                            MessageToast.show("Record posted");
                            this.byId("wiptable").removeSelections();
                            this._getwipprojectdata();
                        },
                        error: (err) => {
                            MessageToast.show(err);
                            this.byId("wiptable").removeSelections();
                        }
                    });
                }
            }
        },
        /****************
        *  Ready To Billed: Method to show the WIPEdits with Status 10
        ****************/
        _readyToBillTab: function (oevent) {

            sap.ui.core.BusyIndicator.show(0);
            var oTable = this.getView().byId("wiptable");

            var selectedItems = oTable._aSelectedPaths;

            var jemap = new Map();
            if (selectedItems.length > 1) jemap.set("Multi", true); else jemap.set("Multi", false);
            for (var i = 0; i < selectedItems.length; i++) {
                var ind = selectedItems[i].slice(1);
                for (var j = 0; j < oTable.getColumns().length; j++) {
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_chngind")) var status = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_jeid")) var jeid = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_unbqty")) var unbqty = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_wrkpckg")) var wrkpkg = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_notes")) var notes = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_proj")) var projid = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_acttype")) var actype = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_prnr")) var prnr = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_srvcrenddate")) var servdate = oTable.getItems()[ind].getCells()[j].getText();

                }

                //Perform an update, if it has already been updated or created
               
                if ((status === 'Original')) {             
                    var editpayload = {
                        JEID: jeid,
                        Status: "10",
                        ID: "1",
                        ProjectID: projid,
                        Quantity: unbqty,
                        WBS: wrkpkg,
                        Notes: notes,
                        ActivityType: actype,
                        EmployeeID: prnr,
                        ServiceDate: this.formatter.dateTimebackendwithtime(servdate)
                    };
                   
                    var saveeditapi = this.getOwnerComponent().getModel("wipeditsMDL");
                    saveeditapi.create("/YY1_WIPEDITS", editpayload, {
                        success: (odata) => {

                            this._getwipprojectdata();
                            this.byId("wiptable").removeSelections();
                            sap.ui.core.BusyIndicator.hide();
                        },
                        error: (err) => {
                           
                            sap.ui.core.BusyIndicator.hide();
                            MessageToast.show(err);
                        }
                    });
                }
               
                else

                //jemap.set(jeid, ind);
                if(status === 'New' || 'Updated' || 'Deleted'){
                    MessageBox.show("New/Updated/Deleted Cannot be Billed");
                    sap.ui.core.BusyIndicator.hide();
                    this.byId("wiptable").removeSelections();
                }
                // if (status === 'Updated') {

                //     var wipmodel = this.getOwnerComponent().getModel("wipeditsMDL");
                //     var filterjeid = new Filter("JEID", FilterOperator.EQ, jeid);
                //     wipmodel.read("/YY1_WIPEDITS", {
                //         filters: [filterjeid],
                //         success: (odata) => {
                //             var esetguid = odata.results[0].SAP_UUID;
                //             var editpayload = {
                //                 JEID: jeid,
                //                 Status: "10",
                //                 ID: "1",
                //                 ProjectID: projid,
                //                 Quantity: unbqty,
                //                 WBS: wrkpkg,
                //                 Notes: notes,
                //                 ActivityType: actype,
                //                 EmployeeID: prnr,
                //                 ServiceDate: this.formatter.dateTimebackendwithtime(servdate)
                //             };
                //             var esetwithguid = "/YY1_WIPEDITS(guid'" + esetguid + "')";
                //             var saveeditapi = this.getOwnerComponent().getModel("wipeditsMDL");
                //             saveeditapi.update(esetwithguid, editpayload, {
                //                 success: (odata) => {

                //                     this._getwipprojectdata();
                //                     this.byId("wiptable").removeSelections();
                //                     sap.ui.core.BusyIndicator.hide();
                //                 },
                //                 error: (err) => {
                //                     sap.ui.core.BusyIndicator.hide();
                //                     MessageToast.show(err);


                //                 }
                //             });


                //         },
                //         error: (msg) => {

                //         }
                //     });



                // }
               
            }
 
        },
        onFilterSelect: function (oEvent) {
            var oBinding = this.byId("wiptable").getBinding("items");
            var sKey = oEvent.getParameter("key");
            if (sKey === "WIPICONTABKEY") {
                // MessageToast.show("WIP");
                //this._getwipprojectdata();
            }
            if (sKey === "RTBICONTABKEY") {
               this._readyToBillTableData();
            }
        },
        _readyToBillTableData : function(){
            var wipeditsmdl = this.getOwnerComponent().getModel("wipeditsMDL");
            var projidfilter = new Filter("ProjectID", FilterOperator.EQ, this.pid);
            var count = 0;
            wipeditsmdl.read("/YY1_WIPEDITS", {
                filters: [projidfilter],
                success: (odata) => {

                    var wipprojjson = new JSONModel();
                    wipprojjson.setData(odata.results);
                    for (var i = 0; i < odata.results.length; i++) {
                     
                        if (odata.results[i].Status === '10') {
                            count = count + 1;

                        }

                    }
                    var countjson = new JSONModel();
                    countjson.setData(count);
                    this.getView().setModel(countjson, "countrtb");

                    this.getView().byId("rtobilltable").setModel(wipprojjson, "rtobill");

                },
                error: (err) => {
                    MessageToast.show(err);
                }
            });
        },


        /****************
         *  Method to update JE record - Triggered when clicking on "Edit" button 
         ****************/
        _updatejeRecord: function (oevent) {

            var oTable = this.getView().byId("wiptable");

            var selectedItems = oTable._aSelectedPaths;

            if (selectedItems.length < 1) {
                MessageBox.alert("Please select atleast 1 row to edit");
                return;
            }
            if (!this.pDialog) {
                this.pDialog = sap.ui.xmlfragment(this.getView().getId(), "com.chappota.wippoc2.wipproject2.wip2.fragments.S2_Edited_WIP", this);
                this.getView().addDependent(this.pDialog);
            }
            var ind = selectedItems[0].slice(1);
            for (var j = 0; j < oTable.getColumns().length; j++) {
                if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_chngind")) var status = oTable.getItems()[ind].getCells()[j].getText();
                if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_jeid")) var jeid = oTable.getItems()[ind].getCells()[j].getText();
                if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_unbqty")) var unbqty = oTable.getItems()[ind].getCells()[j].getText();
                if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_wrkpckg")) var wrkpkg = oTable.getItems()[ind].getCells()[j].getText();
                if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_notes")) var notes = oTable.getItems()[ind].getCells()[j].getText();
                if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_acttype")) var actype = oTable.getItems()[ind].getCells()[j].getText();
                if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_prnr")) var prnr = oTable.getItems()[ind].getCells()[j].getText();
                if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_srvcrenddate")) var servdate = oTable.getItems()[ind].getCells()[j].getText();

            }
            if (selectedItems.length === 1) {

                // var ind = selectedItems[0].slice(1);
                this.getView().byId("editleftunbilamnt").setText(unbqty);
                this.getView().byId("editleftwpkg").setText(wrkpkg);
                this.getView().byId("editleftacttype").setText(actype);
                this.getView().byId("editleftprnr").setText(prnr);
                this.getView().byId("editleftservdate").setText(this.formatter.dateTime(servdate));
                this.getView().byId("editleftnotes").setText(notes);
                this.getView().byId("editrightprojectid").setValue(this.pid);
                this.getView().byId("editrightunbilamnt").setValue(unbqty);
                this.getView().byId("editrightwpkg").setValue(wrkpkg);
                this.getView().byId("editrightacttype").setValue(actype);
                this.getView().byId("editrightprnr").setValue(prnr);
                this.getView().byId("editrightservdate").setValue(this.formatter.dateTime(servdate));
                this.getView().byId("editrightnotes").setValue(notes);

            } else {
                //check if the wp,personalnumber,acttype are same




                this.getView().byId("editleftunbilamnt").setText(this.multilabel);
                this.getView().byId("editleftwpkg").setText(this.multilabel);
                this.getView().byId("editleftnotes").setText(this.multilabel);
                this.getView().byId("editleftacttype").setText(this.multilabel);
                this.getView().byId("editleftprnr").setText(this.multilabel);
                this.getView().byId("editleftservdate").setText(this.multilabel);

                this.getView().byId("editrightunbilamnt").setValue("");
                this.getView().byId("editrightwpkg").setValue("");
                this.getView().byId("editrightnotes").setValue("");
                this.getView().byId("editrightacttype").setValue("");
                this.getView().byId("editrightprnr").setValue("");
                this.getView().byId("editrightservdate").setValue("");
            }
            //            for (var i = 0; i < selectedItems.length; i++) {
            //var str = item.getSelected();
            //var str = item.getCells[0].getText();
            //            }
            this.pDialog.open();
        },
        _closechangerecord: function () {
            this.pDialog.close();
            this.byId("wiptable").removeSelections();
        },

        _multiDeleteOriginal: function (multiaccdoc) {
            var delapi = this.getOwnerComponent().getModel("wipeditsMDL");
            var editpayload = {
                JEID: multiaccdoc,
                ID: "1",
                Status: "11",
                ProjectID: this.project,
                Quantity: this.qty,
                WBS: this.wrkpkg,
                Notes: this.notes,
                ActivityType: this.acttype,
                ServiceDate: this.formatter.dateTimebackendwithtime(this.timesheetdate)
            };


            delapi.create("/YY1_WIPEDITS", editpayload, {
                success: (odata) => {

                    this._getwipprojectdata();
                    this.byId("wiptable").removeSelections();
                },
                error: (err) => {
                    MessageToast.show(err);
                    this.byId("wiptable").removeSelections();
                }
            });

        },
        _deleteWIPEdit: function (jeid) {

            var delapi = this.getOwnerComponent().getModel("wipeditsMDL");
            var filterjeid = new Filter("JEID", FilterOperator.EQ, jeid);

            sap.ui.core.BusyIndicator.show(0);

            delapi.read("/YY1_WIPEDITS", {
                filters: [filterjeid],
                success: (odata) => {
                    sap.ui.core.BusyIndicator.hide();
                    var oTable = this.getView().byId("wiptable");

                    var selectedItems = oTable._aSelectedPaths;
        
                    if (selectedItems.length < 1) {
                        MessageBox.alert("Please select atleast 1 row to edit");
                        return;
                    }
                
                    var ind = selectedItems[0].slice(1);
                    for (var j = 0; j < oTable.getColumns().length; j++) {
                        if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_chngind")) var status = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_jeid")) var jeid = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_unbqty")) var unbqty = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_wrkpckg")) var wrkpkg = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_notes")) var notes = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_proj")) var projid = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_acttype")) var actype = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_prnr")) var prnr = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_srvcrenddate")) var servdate = oTable.getItems()[ind].getCells()[j].getText();

                    }
                    // this.byId("wiptable").removeSelections();
                    var deleteapi = this.getOwnerComponent().getModel("wipeditsMDL");
                    if(status === 'Original'){
                        //Insert WIP Edit with status '03'
                        var editpayload = {
                            JEID: jeid,
                            Status: "03",
                            ID: "1",
                            ProjectID: projid,
                            Quantity: unbqty,
                            WBS: wrkpkg,
                            Notes: notes,
                            ActivityType: actype,
                            EmployeeID: prnr,
                            ServiceDate: this.formatter.dateTimebackendwithtime(servdate)
                        };

                        
                        deleteapi.create("/YY1_WIPEDITS", editpayload, {
                            success: (odata) => {

                                this._getwipprojectdata();
                                this.byId("wiptable").removeSelections();
                                sap.ui.core.BusyIndicator.hide();
                            },
                            error: (err) => {
                               
                                sap.ui.core.BusyIndicator.hide();
                                MessageToast.show(err);
                            }


                        });

                     }



                    if(odata.results.length>0){
                    var esetguid = odata.results[0].SAP_UUID;              
                 
                    var esetwithguid = "/YY1_WIPEDITS(guid'" + esetguid + "')";
                    
                     if(status === 'Updated'){
                        //Update WIP Edit with status '03'
                     //suman
                     var editpayload = {
                                        JEID: jeid,
                                        Status: "03",
                                        ID: "1",
                                        ProjectID: projid,
                                        Quantity: unbqty,
                                        WBS: wrkpkg,
                                        Notes: notes,
                                        ActivityType: actype,
                                        EmployeeID: prnr,
                                        ServiceDate: this.formatter.dateTimebackendwithtime(servdate)
                                    };
                                  
                                    deleteapi.update(esetwithguid, editpayload, {
                                        success: (odata) => {
        
                                            this._getwipprojectdata();
                                            this.byId("wiptable").removeSelections();
                                            sap.ui.core.BusyIndicator.hide();
                                        },
                                        error: (err) => {
                                            sap.ui.core.BusyIndicator.hide();
                                            MessageToast.show(err);
        
        
                                        }
                                    });

                     }
                     if(status === 'New'){
                        //Remove the corresponding WIP edit record
                        var that = this;
                        return new Promise(
                            function(resolve,reject){
                                    delapi.remove(esetwithguid, {
                                        success : function(odata) {    
                                            sap.ui.core.BusyIndicator.hide();                      
                                           resolve(odata);    
                                                 
                                           that._getwipprojectdata(); 
                                                     
                                        },
                                        error : function(err) {
                                            sap.ui.core.BusyIndicator.hide();
                                            reject(error);                                                   
        
                                        }
                                        });
        
                                    }             
                        );

                     }
                     if(status === 'Deleted'){
                        //DO Nothing
                        this.byId("wiptable").removeSelections();
                     }
                    }
                    /*
                    var that = this;
                    return new Promise(
                        function(resolve,reject){
                        delapi.remove(esetwithguid,{
                            success : function(odata){
                                resolve(odata);
                                sap.ui.core.BusyIndicator.hide();
                                that._getwipprojectdata();
                                that.byId("wiptable").removeSelections();
                            },
                            error : function(msg){
                                reject(msg);
                                sap.ui.core.BusyIndicator.hide();
                            }
                        });
                        }

                    );
                    */
                
                // else {
                //     MessageBox.show("Cannot Delete 'Original' Record");
                //     sap.ui.core.BusyIndicator.hide();
                //     this.byId("wiptable").removeSelections();
                // }
                },
                error : (msg) => {
                    MessageBox.show(msg);
                    sap.ui.core.BusyIndicator.hide();
                    this.byId("wiptable").removeSelections();
                }
            });
        },
        _deletejeRecord: function (jeid) {

            var oTable = this.getView().byId("wiptable");
            //var nvalue =	oTable.getItems()[i].getCells()[i].getText();  
            var selectedItems = oTable._aSelectedPaths;
            var ind = selectedItems[0].slice(1);
            for (var j = 0; j < oTable.getColumns().length; j++) {

                if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_jeid")) var jeid = oTable.getItems()[ind].getCells()[j].getText();


            }
            if (selectedItems.length < 1) {
                MessageBox.alert("Please select atleast 1 row to edit");
                return;
            }

            for (var i = 0; i < selectedItems.length; i++) {
                this._deleteWIPEdit(jeid);
            }

        },




        /**************************************/
        /*  Method to  Sort Table    */
        /**************************************/
        getViewSettingsDialog: function (sDialogFragmentName) {
            var pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

            if (!pDialog) {
                pDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: sDialogFragmentName,
                    controller: this
                }).then(function (oDialog) {
                    if (Device.system.desktop) {
                        oDialog.addStyleClass("sapUiSizeCompact");
                    }
                    return oDialog;
                });
                this._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
            }
            return pDialog;
        },

        handleSortButtonPressed: function () {
            this.getViewSettingsDialog("com.chappota.wippoc2.wipproject2.wip2.fragments.S2_SortNew")
                .then(function (oViewSettingsDialog) {
                    oViewSettingsDialog.open();
                });
        },
        handleSortDialogConfirm: function (oEvent) {

            var oTable = this.byId("wiptable"),
                mParams = oEvent.getParameters(),
                oBinding = oTable.getBinding("items"),
                sPath,
                bDescending,
                aSorters = [];

            sPath = mParams.sortItem.getKey();
            bDescending = mParams.sortDescending;
            aSorters.push(new Sorter(sPath, bDescending));

            // apply the selected sort and group settings
            oBinding.sort(aSorters);
        },


        /**************************************/
        /*  Method  to Filter Table */
        /**************************************/
        handleFilterButtonPressed: function () {
            this.getViewSettingsDialog("com.chappota.wippoc2.wipproject2.wip2.fragments.S2_Filter")
                .then(function (oViewSettingsDialog) {
                    oViewSettingsDialog.open();
                });
        },
        handleFilterDialogConfirm: function (oEvent) {
            var oTable = this.byId("wiptable"),
                mParams = oEvent.getParameters(),
                oBinding = oTable.getBinding("items"),
                aFilters = [];

            mParams.filterItems.forEach(function (oItem) {
                var aSplit = oItem.getKey().split("___"),
                    sPath = aSplit[0],
                    sOperator = aSplit[1],
                    sValue1 = aSplit[2],
                    sValue2 = aSplit[3],
                    oFilter = new Filter(sPath, sOperator, sValue1, sValue2);
                aFilters.push(oFilter);
            });

            // apply filter settings
            oBinding.filter(aFilters);

            // update filter bar
            this.byId("vsdFilterBar").setVisible(aFilters.length > 0);
            this.byId("vsdFilterLabel").setText(mParams.filterString);
        },
        /**************************************/
        /*  Method used for Table Personaliztion*/
        /**************************************/
        onPersoButtonPressed: function (oEvent) {
            this._oTPC.openDialog();
        },

        onExit: function () {
            this._oTPC.destroy();
        },
        onTablePersoRefresh: function () {
            DemoPersoService.resetPersData().done(
                function () {
                    this._oTPC.refresh();
                }.bind(this)
            );
        },

        onTableGrouping: function (oEvent) {
            this._oTPC.setHasGrouping(oEvent.getSource().getSelected());
        },

        _exportexcel: function () {
            var oExport = new sap.ui.core.util.Export({
                exportType: new sap.ui.core.util.ExportTypeCSV({
                    separatorChar: "\t",
                    mimeType: "application/vnd.ms-excel",
                    charset: "utf-8",
                    fileExtension: "xls"
                }),
                models: this.getView().byId("wiptable").getModel("wipentry"),
                rows: {
                    path: "/"
                },
                columns: [

                    {
                        name: "Status",
                        template: {
                            content: {
                                parts: ["Status"],
                                formatter: function (st) {
                                    if (st === '' || st === undefined) {
                                        return "Original";
                                    }
                                    else
                                        return st;
                                }
                            }
                        }

                    },
                    {
                        name: "AccountingDocument",
                        template: {
                            content: "{AccountingDocument}"
                        }

                    },

                    {
                        name: "GLAccount",
                        template: {
                            content: "{GLAccount}"
                        }

                    },
                    {
                        name: "ReferenceDocument",
                        template: {
                            content: "{ReferenceDocument}"
                        }

                    },
                    {
                        name: "Customer",
                        template: {
                            content: "{Customer}"
                        }

                    },
                    {
                        name: "Project",
                        template: {
                            content: "{Project}"
                        }

                    },
                    {
                        name: "Unbilled Quantity",
                        template: {
                            content: "{Quantity}"
                        }

                    },

                    {
                        name: "WorkPackage",
                        template: {
                            content: "{WBSElement}"
                        }

                    },
                    {
                        name: "AmountInGlobalCurrency",
                        template: {
                            content: "{AmountInGlobalCurrency}"
                        }

                    },
                    {
                        name: "ActivityType",
                        template: {
                            content: "{OriginCostCtrActivityType}"
                        }

                    },
                    {
                        name: "PersonnelNumber",
                        template: {
                            content: "{PersonnelNumber}"
                        }

                    },
                    {
                        name: "ServicesRenderedDate",
                        template: {
                            content: {
                                parts: ["ServicesRenderedDate"],
                                formatter: function (date) {
                                    if (date !== undefined && date !== null) {

                                        var oDateFormat = DateFormat.getDateInstance({
                                            scale: "medium",

                                            pattern: "MMM dd, yyyy"
                                        });
                                        var subFromDate = oDateFormat.format(new Date(date));

                                        return subFromDate;
                                    } else {

                                        return "";
                                    }

                                }
                            }
                        }

                    },
                    {
                        name: "Notes",
                        template: {
                            content: "{DocumentItemText}"
                        }

                    },


                ]
            });
            // download exported file
            oExport.saveFile().catch(function (oError) {
                MessageBox.error("Error when downloading data. Please try again!\n\n" + oError);
            }).then(function () {
                oExport.destroy();
            });
        },


        /**************************************/
        /*  Method   */
        /**************************************/
        _reviewAgain: function () {
            sap.ui.core.BusyIndicator.show(0);
            var oTable = this.getView().byId("rtobilltable");
            var selItems = oTable._aSelectedPaths;
            var map1 = new Map();
            if (selItems.length > 1) map1.set("Multi", true);
            else map1.set("Multi", false);
            if (selItems.length < 1) {
                MessageBox.error("Select atleast 1 record");
            }

            for (var i = 0; i < selItems.length; i++) {
                var ind = selItems[i].slice(1);

                var jeid = oTable.getItems()[ind].getCells()[1].getText();
            }

            for (var i = 0; i < selItems.length; i++) {
                var ind = selItems[i].slice(1);
                for (var j = 0; j < oTable.getColumns().length; j++) {
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_chngind")) var status = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_jeid")) var jeid = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_unbqty")) var unbqty = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_wrkpckg")) var wrkpkg = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_notes")) var notes = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_proj")) var projid = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_acttype")) var actype = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_prnr")) var prnr = oTable.getItems()[ind].getCells()[j].getText();
                    if (oTable.getColumns()[j].getHeader().getText() === this.getView().getModel("i18n").getResourceBundle().getText("txt_srvcrenddate")) var servdate = oTable.getItems()[ind].getCells()[j].getText();

                }          


            }

            var delapi = this.getOwnerComponent().getModel("wipeditsMDL");
            var filterjeid = new Filter("JEID", FilterOperator.EQ, jeid);
           
            delapi.read("/YY1_WIPEDITS", {
                filters: [filterjeid],
                success: (odata) => {
                    sap.ui.core.BusyIndicator.hide();
                    var esetguid = odata.results[0].SAP_UUID;
                    var editpayload = {
                    };
                    var esetwithguid = "/YY1_WIPEDITS(guid'" + esetguid + "')";
                    var that = this;
                return new Promise(
                    function(resolve,reject){
                            delapi.remove(esetwithguid, {
                                success : function(odata) {    
                                    sap.ui.core.BusyIndicator.hide();                      
                                   resolve(odata);    
                                         
                                   that._getwipprojectdata(); 
                                   that._rbillStatus10();               
                                },
                                error : function(err) {
                                    sap.ui.core.BusyIndicator.hide();
                                    reject(error);                                                   

                                }
                                });

                            }             
                );
                },
                error : function(msg){
                    sap.ui.core.BusyIndicator.hide();
                }

            });
        },
        _rbillStatus10 : function(){
            var wipeditsmdl = this.getOwnerComponent().getModel("wipeditsMDL");
            var projidfilter = new Filter("ProjectID", FilterOperator.EQ, this.pid);
            
            wipeditsmdl.read("/YY1_WIPEDITS", {
                filters: [projidfilter],
                success: (odata) => {

                    var wipprojjson = new JSONModel();
                    wipprojjson.setData(odata.results);                  

                    this.getView().byId("rtobilltable").setModel(wipprojjson, "rtobill");

                },
                error: (err) => {
                    MessageToast.show(err);
                }
            });

        },
        _showBDRMessage: function () {
            MessageBox.success("BDR:xxxx has been created from the selected items");
        },
        // **************************************************** */
        //              PROJECT DATA                           //
        //***************************************************** */
        _projectdata: function () {

            if (!this.proddata) {
                this.proddata = this.loadFragment({
                    name: "com.chappota.wippoc2.wipproject2.wip2.fragments.S2_ProjectDataVH"
                });
            }

            this.proddata.then(function (oDialog) {
                oDialog.open();

                sap.ui.core.BusyIndicator.show(0);
            });


            var prododata = this.getOwnerComponent().getModel("s1");
            prododata.read("/ProjectSet", {
                urlParameters: {
                    $select: 'ProjectID,ProjectName',
                    $orderby: 'ProjectID'
                    // $top : 100
                },
                success: (odata) => {

                    var prodjson = new JSONModel();
                    prodjson.setSizeLimit(odata.results.length);
                    prodjson.setData(odata.results);
                    this.getView().setModel(prodjson, "s2");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: (msg) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Error");

                }
            });

        },
        _handleValueHelpSearch: function (evt) {
            var sValue = evt.getParameter("value");
            var oFilter = new Filter("ProjectID", FilterOperator.Contains, sValue);

            evt.getSource().getBinding("items").filter([oFilter]);


        },
        _handleValueHelpClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            oEvent.getSource().getBinding("items").filter([]);

            if (!oSelectedItem) {
                return;
            }

            this.byId("editrightprojectid").setValue(oSelectedItem.getTitle());

        },
        _projsearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter(
                "ProjectID",
                FilterOperator.Contains,
                sValue
            );
            //this.byId("projecttable").getBinding("items").filter([oFilter]);

        },

        // **************************************************** */
        //              WorkPackage DATA                           //
        //***************************************************** */
        _wpdata: function () {

            if (!this.wpdata) {
                this.wpdata = this.loadFragment({
                    name: "com.chappota.wippoc2.wipproject2.wip2.fragments.S2_WorkPackageDataVH"
                });
            }

            this.wpdata.then(function (oDialogwp) {
                oDialogwp.open();

                sap.ui.core.BusyIndicator.show(0);
            });

            var projectdatavhvalue = this.byId("editrightprojectid").getValue();

            var wrkpkgdata = this.getOwnerComponent().getModel("wrkpkgMDL");
            var projdatavhfilter = new Filter("ProjectID", FilterOperator.EQ, projectdatavhvalue);
            var eset = "/ProjectSet('" + projectdatavhvalue + "')/WorkPackageSet";
            wrkpkgdata.read(eset, {
                // filters : [projdatavhfilter],

                urlParameters: {
                    // $expand : 'WorkPackageSet'
                    $select: 'WorkPackageID,WorkPackageName'
                    //$orderby: 'ProjectID'
                    // $top : 100
                },
                success: (odata) => {

                    var wrkpkgjson = new JSONModel();
                    wrkpkgjson.setSizeLimit(odata.results.length);
                    wrkpkgjson.setData(odata.results);
                    this.getView().setModel(wrkpkgjson, "wrkpkg");
                    sap.ui.core.BusyIndicator.hide();
                },
                error: (msg) => {
                    sap.ui.core.BusyIndicator.hide();
                    MessageToast.show("Error");

                }
            });

        },
        _handleValueHelpSearchwp: function (evt) {
            // var sValue = evt.getParameter("value");
            // var oFilter = new Filter("WorkPackageID", FilterOperator.Contains, sValue);

            // evt.getSource().getBinding("items").filter([oFilter]);


        },
        _handleValueHelpClosewp: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            oEvent.getSource().getBinding("items").filter([]);

            if (!oSelectedItem) {
                return;
            }

            this.byId("editrightwpkg").setValue(oSelectedItem.getTitle());

        },



        /**
         * Called when the worklist controller is instantiated.
         * @public
         */
        _onInit: function () {
            // Model used to manipulate control states. The chosen values make sure,
            // detail page shows busy indication immediately so there is no break in
            // between the busy indication for loading the view's meta data
            var oViewModel = new JSONModel({ busy: true, delay: 0 });
            this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
            this.setModel(oViewModel, "objectView");
        },
        /* =========================================================== */
        /* event handlers                                              */
        /* =========================================================== */


        /**
         * Event handler  for navigating back.
         * It there is a history entry we go one step back in the browser history
         * If not, it will replace the current entry of the browser history with the worklist route.
         * @public
         */
        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) { // eslint-disable-next-line sap-no-history-manipulation
                history.go(-1);
            } else {
                this.getRouter().navTo("worklist", {}, true);
            }
        },

        /* =========================================================== */
        /* internal methods                                            */
        /* =========================================================== */

        /**
         * Binds the view to the object path.
         * @function
         * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
         * @private
         */
        _onObjectMatched: function (oEvent) {
            var sObjectId = oEvent.getParameter("arguments").objectId;
            this._bindView("/ProjectSet" + sObjectId);
        },

        /**
         * Binds the view to the object path.
         * @function
         * @param {string} sObjectPath path to the object to be bound
         * @private
         */
        _bindView: function (sObjectPath) {
            var oViewModel = this.getModel("objectView");

            this.getView().bindElement({
                path: sObjectPath,
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        oViewModel.setProperty("/busy", true);
                    },
                    dataReceived: function () {
                        oViewModel.setProperty("/busy", false);
                    }
                }
            });
        },

        _onBindingChange: function () {
            var oView = this.getView(),
                oViewModel = this.getModel("objectView"),
                oElementBinding = oView.getElementBinding();

            // No data for the binding
            if (!oElementBinding.getBoundContext()) {
                this.getRouter().getTargets().display("objectNotFound");
                return;
            }

            var oResourceBundle = this.getResourceBundle(),
                oObject = oView.getBindingContext().getObject(),
                sObjectId = oObject.CompanyCode,
                sObjectName = oObject.ProjectSet;

            oViewModel.setProperty("/busy", false);
            oViewModel.setProperty("/shareSendEmailSubject", oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
            oViewModel.setProperty("/shareSendEmailMessage", oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
        }
    });

});
