/*global QUnit*/

sap.ui.define([
	"error/workflow-ui-module/controller/orderApprovalForm.controller"
], function (Controller) {
	"use strict";

	QUnit.module("orderApprovalForm Controller");

	QUnit.test("I should test the orderApprovalForm controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
