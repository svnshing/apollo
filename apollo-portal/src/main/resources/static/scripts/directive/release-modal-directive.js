directive_module.directive('releasemodal', releaseModalDirective);

function releaseModalDirective($translate, toastr, AppUtil, EventManager, ReleaseService, NamespaceBranchService) {
    return {
        restrict: 'E',
        templateUrl: AppUtil.prefixPath() + '/views/component/release-modal.html',
        transclude: true,
        replace: true,
        scope: {
            appId: '=',
            env: '=',
            cluster: '='
        },
        link: function (scope) {

            scope.switchReleaseChangeViewType = switchReleaseChangeViewType;
            scope.release = release;
            scope.compare = compare;
            scope.releaseBtnDisabled = false;
            scope.releaseChangeViewType = 'change';
            scope.releaseComment = '';
            scope.isEmergencyPublish = false;

            EventManager.subscribe(EventManager.EventType.PUBLISH_NAMESPACE,
                function (context) {

                    var namespace = context.namespace;
                    scope.toReleaseNamespace = context.namespace;
                    scope.isEmergencyPublish = !!context.isEmergencyPublish;

                    var date = new Date().Format("yyyyMMddhhmmss");
                    if (namespace.mergeAndPublish) {
                        namespace.releaseTitle = date + "-gray-release-merge-to-master";
                    } else if (namespace.isBranch) {
                        namespace.releaseTitle = date + "-gray";
                    } else {
                        namespace.releaseTitle = date + "-release";
                    }

                    AppUtil.showModal('#releaseModal');
                });

            function release() {
                if (scope.toReleaseNamespace.mergeAndPublish) {
                    mergeAndPublish();
                } else if (scope.toReleaseNamespace.isBranch) {
                    grayPublish();
                } else {
                    publish();
                }

            }

            function publish() {
                scope.releaseBtnDisabled = true;
                ReleaseService.publish(scope.appId, scope.env,
                    scope.toReleaseNamespace.baseInfo.clusterName,
                    scope.toReleaseNamespace.baseInfo.namespaceName,
                    scope.toReleaseNamespace.releaseTitle,
                    scope.releaseComment,
                    scope.isEmergencyPublish).then(
                    function (result) {
                        AppUtil.hideModal('#releaseModal');
                        toastr.success($translate.instant('ReleaseModal.Published'));

                        scope.releaseBtnDisabled = false;

                        EventManager.emit(EventManager.EventType.REFRESH_NAMESPACE,
                            {
                                namespace: scope.toReleaseNamespace
                            })

                    }, function (result) {
                        scope.releaseBtnDisabled = false;
                        toastr.error(AppUtil.errorMsg(result), $translate.instant('ReleaseModal.PublishFailed'));

                    }
                );

            }

            function grayPublish() {
                scope.releaseBtnDisabled = true;
                ReleaseService.grayPublish(scope.appId, scope.env,
                    scope.toReleaseNamespace.parentNamespace.baseInfo.clusterName,
                    scope.toReleaseNamespace.baseInfo.namespaceName,
                    scope.toReleaseNamespace.baseInfo.clusterName,
                    scope.toReleaseNamespace.releaseTitle,
                    scope.releaseComment,
                    scope.isEmergencyPublish).then(
                    function (result) {
                        AppUtil.hideModal('#releaseModal');
                        toastr.success($translate.instant('ReleaseModal.GrayscalePublished'));

                        scope.releaseBtnDisabled = false;

                        //refresh item status
                        scope.toReleaseNamespace.branchItems.forEach(function (item, index) {
                            if (item.isDeleted) {
                                scope.toReleaseNamespace.branchItems.splice(index, 1);
                            } else {
                                item.isModified = false;
                            }
                        });
                        //reset namespace status
                        scope.toReleaseNamespace.itemModifiedCnt = 0;
                        scope.toReleaseNamespace.lockOwner = undefined;

                        //check rules
                        if (!scope.toReleaseNamespace.rules
                            || !scope.toReleaseNamespace.rules.ruleItems
                            || !scope.toReleaseNamespace.rules.ruleItems.length) {

                            scope.toReleaseNamespace.viewType = 'rule';
                            AppUtil.showModal('#grayReleaseWithoutRulesTips');
                        }

                    }, function (result) {
                        scope.releaseBtnDisabled = false;
                        toastr.error(AppUtil.errorMsg(result), $translate.instant('ReleaseModal.GrayscalePublishFailed'));

                    });
            }

            function mergeAndPublish() {

                NamespaceBranchService.mergeAndReleaseBranch(scope.appId,
                    scope.env,
                    scope.cluster,
                    scope.toReleaseNamespace.baseInfo.namespaceName,
                    scope.toReleaseNamespace.baseInfo.clusterName,
                    scope.toReleaseNamespace.releaseTitle,
                    scope.releaseComment,
                    scope.isEmergencyPublish,
                    scope.toReleaseNamespace.mergeAfterDeleteBranch)
                    .then(function (result) {

                        toastr.success($translate.instant('ReleaseModal.AllPublished'));

                        EventManager.emit(EventManager.EventType.REFRESH_NAMESPACE,
                            {
                                namespace: scope.toReleaseNamespace
                            })

                    }, function (result) {
                        toastr.error(AppUtil.errorMsg(result), $translate.instant('ReleaseModal.AllPublishFailed'));
                    });

                AppUtil.hideModal('#releaseModal');
            }

            function switchReleaseChangeViewType(type) {
                scope.releaseChangeViewType = type;
            }

            function compare(item, mode = 0) {
                let oldV = item.oldValue;
                let newV = item.newValue;
                EventManager.emit(EventManager.EventType.TEXT_COMPARE,
                    {
                        oldV: oldV,
                        newV: newV,
                        mode: mode
                    });
            }
        }
    }
}


