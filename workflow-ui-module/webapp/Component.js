sap.ui.define(
  [
      "sap/ui/core/UIComponent",
      "sap/ui/Device",
      "error/workflowuimodule/model/models",
  ],
  function (UIComponent, Device, models) {
      "use strict";
 
      return UIComponent.extend("error.workflowuimodule.Component", {
          metadata: {
              manifest: "json",
          },
 
          /**
           * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
           * @public
           * @override
           */
          init: function () {
              // call the base component's init function
              UIComponent.prototype.init.apply(this, arguments);
 
              // enable routing
              this.getRouter().initialize();
 
              // set the device model
              this.setModel(models.createDeviceModel(), "device");
 
              this.setTaskModels();
 
              const rejectOutcomeId = "reject";
              this.getInboxAPI().addAction(
                  {
                      action: rejectOutcomeId,
                      label: "Reject",
                      type: "reject",
                  },
                  function () {
                      this.completeTask(false, rejectOutcomeId);
                  },
                  this
              );
 
              const approveOutcomeId = "approve";
              this.getInboxAPI().addAction(
                  {
                      action: approveOutcomeId,
                      label: "Approve",
                      type: "accept",
                  },
                  function () {
                      this.completeTask(true, approveOutcomeId);
                  },
                  this
              );
          },
 
          setTaskModels: function () {
              // set the task model
              var startupParameters = this.getComponentData().startupParameters;
              this.setModel(startupParameters.taskModel, "task");
 
              // set the task context model
              var taskContextModel = new sap.ui.model.json.JSONModel(
                  this._getTaskInstancesBaseURL() + "/context"
              );
              this.setModel(taskContextModel, "context");
          },
 
          _getTaskInstancesBaseURL: function () {
              return (
                  this._getWorkflowRuntimeBaseURL() +
                  "/task-instances/" +
                  this.getTaskInstanceID()
              );
          },
 
          _getWorkflowRuntimeBaseURL: function () {
              var ui5CloudService = this.getManifestEntry("/sap.cloud/service").replaceAll(".", "");
              var ui5ApplicationName = this.getManifestEntry("/sap.app/id").replaceAll(".", "");
              var appPath = `${ui5CloudService}.${ui5ApplicationName}`;
              return `/${appPath}/api/public/workflow/rest/v1`;
          },
 
          getTaskInstanceID: function () {
              return this.getModel("task").getData().InstanceID;
          },
 
          getInboxAPI: function () {
              var startupParameters = this.getComponentData().startupParameters;
              return startupParameters.inboxAPI;
          },
 
          completeTask: function (approvalStatus, outcomeId) {
              this.getModel("context").setProperty("/approved", approvalStatus);
 
              // Ensure requestitem structure is valid
              this._sanitizeRequestItems();
 
              this._patchTaskInstance(outcomeId);
          },
 
          _sanitizeRequestItems: function () {
              const context = this.getModel("context").getData();
 
              if (Array.isArray(context.requestitem)) {
                  context.requestitem = context.requestitem.map((item) => ({
                      ItemNo: Number(item.ItemNo) || 0,
                      ItemDesc: item.ItemDesc || "",
                      Quantity: Number(item.Quantity) || 0,
                      ItemPrice: Number(item.ItemPrice) || 0,
                      Material: item.Material || "",
                      Plant: item.Plant || "",
                  }));
              }
 
              // Update the model with sanitized data
              this.getModel("context").setData(context);
              console.log("Sanitized requestitem:", context.requestitem);
          },
 
          _patchTaskInstance: function (outcomeId) {
              const context = this.getModel("context").getData();
 
              var data = {
                  status: "COMPLETED",
                  context: {
                      comment: context.comment || "",
                      totalprice: Number(context.totalprice) || 0,
                      requestno: Number(context.requestno) || 0,
                      requestdesc: context.requestdesc || "",
                      requestby: context.requestby || "",
                      requestid: Number(context.requestid) || 0,
                      requestitem: context.requestitem || [],
                  },
                  decision: outcomeId,
              };
 
              console.log("Data being sent in PATCH request:", data);
 
              const csrfToken = this._fetchToken();
              console.log("CSRF Token fetched:", csrfToken);
 
              jQuery.ajax({
                  url: this._getTaskInstancesBaseURL(),
                  method: "PATCH",
                  contentType: "application/json",
                  async: true,
                  data: JSON.stringify(data),
                  headers: {
                      "X-CSRF-Token": csrfToken,
                  },
              })
                  .done((response) => {
                      console.log("Task updated successfully:", response);
                      this._refreshTaskList();
                  })
                  .fail((xhr, status, error) => {
                      console.error("Error updating task:", error);
                      console.log("XHR Response Text:", xhr.responseText);
                  });
          },
 
          _fetchToken: function () {
              var fetchedToken;
 
              jQuery.ajax({
                  url: this._getWorkflowRuntimeBaseURL() + "/xsrf-token",
                  method: "GET",
                  async: false,
                  headers: {
                      "X-CSRF-Token": "Fetch",
                  },
                  success(result, xhr, data) {
                      fetchedToken = data.getResponseHeader("X-CSRF-Token");
                  },
              });
 
              return fetchedToken;
          },
 
          _refreshTaskList: function () {
              this.getInboxAPI().updateTask("NA", this.getTaskInstanceID());
          },
      });
  }
);
