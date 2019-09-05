// Localization completed
angular.module('headwind-kiosk')
    .controller('ConfigurationsTabController', function ($scope, $rootScope, $state, $modal, confirmModal,
                                                         configurationService, authService, $window, localization,
                                                         alertService) {
        $scope.isTypical = false;
        $scope.sort = {
            by: 'name'
        };

        $scope.paging = {
            currentPage: 1,
            pageSize: 50
        };

        $scope.$watch('paging.currentPage', function () {
            $window.scrollTo(0, 0);
        });

        $scope.hasPermission = authService.hasPermission;

        $scope.qrCodeAvailable = function (configuration) {
            return configuration.qrCodeKey && configuration.mainAppId > 0 && configuration.eventReceivingComponent &&
                configuration.eventReceivingComponent.length > 0;
        };

        $scope.showQrCode = function (configuration) {
            var url = configuration.baseUrl + "/#/qr/" + configuration.qrCodeKey;
            $window.open(url, "_blank");
        };

        $scope.init = function (isTypical) {
            $rootScope.settingsTabActive = false;
            $rootScope.pluginsTabActive = false;
            $scope.paging.currentPage = 1;
            $scope.isTypical = isTypical;
            $scope.search();
        };

        $scope.search = function () {
            if ($scope.isTypical) {
                configurationService.getAllTypicalConfigurations(
                    {value: $scope.search.searchValue},
                    function (response) {
                        $scope.configurations = response.data;
                    });
            } else {
                configurationService.getAllConfigurations(
                    {value: $scope.search.searchValue},
                    function (response) {
                        $scope.configurations = response.data;
                    });
            }
        };

        $scope.editConfiguration = function (configuration) {

            // $state.goNewTab('configEditor', {"id": configuration.id, "typical": $scope.isTypical});
            $state.transitionTo('configEditor', {"id": configuration.id, "typical": $scope.isTypical});

        };

        $scope.copyConfiguration = function (configuration) {
            var modalInstance = $modal.open({
                templateUrl: 'app/components/main/view/modal/copyConfiguration.html',
                controller: 'CopyConfigurationModalController',
                resolve: {
                    configuration: function () {
                        return configuration;
                    }
                }
            });

            modalInstance.result.then(function () {
                $scope.search();
            });
        };

        $scope.removeConfiguration = function (configuration) {
            let localizedText = localization.localize('question.delete.configuration').replace('${configurationName}', configuration.name);
            confirmModal.getUserConfirmation(localizedText, function () {
                configurationService.removeConfiguration({id: configuration.id}, function (response) {
                    if (response.status === 'OK') {
                        $scope.search();
                    } else {
                        alertService.showAlertMessage(localization.localize(response.message));
                    }
                }, alertService.onRequestFailure);
            });
        };

        $scope.init(false);
    })
    .controller('CopyConfigurationModalController',
        function ($scope, $modalInstance, configurationService, configuration, localization) {

            $scope.configuration = {"id": configuration.id, "name": ""};

            $scope.save = function () {
                $scope.saveInternal();
            };

            $scope.saveInternal = function () {
                $scope.errorMessage = '';

                if (!$scope.configuration.name) {
                    $scope.errorMessage = localization.localize('error.empty.configuration.name');
                } else {
                    var request = {"id": $scope.configuration.id, "name": $scope.configuration.name};
                    configurationService.copyConfiguration(request, function (response) {
                        if (response.status === 'OK') {
                            $modalInstance.close();
                        } else {
                            $scope.errorMessage = localization.localize('error.duplicate.configuration.name');
                        }
                    });
                }
            };

            $scope.closeModal = function () {
                $modalInstance.dismiss();
            }
        })
    .controller('ApplicationSettingEditorController', function ($scope, $modalInstance, localization,
                                                                applicationSetting, getApps) {
        var copy = {};
        for (var p in applicationSetting) {
            if (applicationSetting.hasOwnProperty(p)) {
                copy[p] = applicationSetting[p];
            }
        }

        $scope.applicationSetting = copy;
        $scope.mainApp = null;
        $scope.errorMessage = undefined;

        if (applicationSetting.id || applicationSetting.tempId) {
            $scope.mainApp = {
                id: applicationSetting.applicationId,
                name: applicationSetting.applicationName,
                pkg: applicationSetting.applicationPkg
            };
        }

        $scope.appLookupFormatter = function (val) {
            if (val) {
                return val.pkg;
            } else {
                return null;
            }
        };

        $scope.onMainAppSelected = function ($item) {
            $scope.mainApp = $item;
        };

        $scope.getApps = getApps;

        $scope.closeModal = function () {
            $modalInstance.dismiss();
        };

        $scope.save = function () {
            $scope.errorMessage = undefined;

            if (!$scope.applicationSetting.name) {
                $scope.errorMessage = localization.localize('error.application.setting.empty.name');
                // } else if (!$scope.applicationSetting.value) {
                //     $scope.errorMessage = localization.localize('error.application.setting.empty.value');
            } else if (!$scope.mainApp || !$scope.mainApp.id) {
                $scope.errorMessage = localization.localize('error.application.setting.empty.app');
            } else {

                $scope.applicationSetting.applicationPkg = $scope.mainApp.pkg;
                $scope.applicationSetting.applicationName = $scope.mainApp.name;
                $scope.applicationSetting.applicationId = $scope.mainApp.id;
                $scope.applicationSetting.lastUpdate = new Date().getTime();

                $modalInstance.close($scope.applicationSetting);
            }
        };
    })
    .controller('AddConfigurationAppModalController', function ($scope, localization, configurationService,
                                                                applications, configuration, $modalInstance, $modal) {

        // TODO : ISV : Update this controller
        // $scope.mainAppSelected = false;
        $scope.mainApp = {id: -1, name: ""};

        $scope.appLookupFormatter = function (val) {
            return val.name + (val.version && val.version !== '0' ? " " + val.version : "");
        };

        // $scope.trackMainApp = function (val) {
        //     $scope.mainAppSelected = val;
        // };

        $scope.onMainAppSelected = function ($item) {
            $scope.mainApp = $item;
            $scope.mainApp.action = 1;
        };

        $scope.getApps = function (filter) {
            var lower = filter.toLowerCase();

            var apps = $scope.availableApplications.filter(function (app) {
                // Intentionally using app.action == 1 but not app.action === 1
                return (app.name.toLowerCase().indexOf(lower) > -1
                    || app.pkg && app.pkg.toLowerCase().indexOf(lower) > -1
                    || app.version && app.version.toLowerCase().indexOf(lower) > -1);
            });

            apps.sort(function (a, b) {
                let n1 = a.name.toLowerCase();
                let n2 = b.name.toLowerCase();

                if (n1 === n2) {
                    return 0;
                } else if (n1 < n2) {
                    return -1;
                } else {
                    return 1;
                }
            });

            return apps;
        };

        $scope.availableApplications = applications.filter(function (app) {
            return app.action == '0' && !app.actionChanged;
        });

        $scope.showIconSelectOptions = [
            {id: true, label: localization.localize('form.configuration.apps.label.show')},
            {id: false, label: localization.localize('form.configuration.apps.label.not.show')},
        ];

        $scope.isPermitOptionAvailable = function (application) {
            return application.system || !application.url || application.url.length === 0;
        };
        $scope.isProhibitOptionAvailable = function (application) {
            return true;
        };
        $scope.isInstallOptionAvailable = function (application) {
            return !(application.system || !application.url || application.url.length === 0);
        };
        $scope.isRemoveOptionAvailable = function (application) {
            return !application.system;
        };
        $scope.actionChanged = function (application) {
            application.remove = (application.action == '2');
        };

        $scope.configuration = configuration;

        $scope.save = function () {
            $modalInstance.close($scope.mainApp);
        };

        $scope.closeModal = function () {
            $modalInstance.dismiss();
        };

        $scope.newApp = function () {
            var modalInstance = $modal.open({
                templateUrl: 'app/components/main/view/modal/application.html',
                controller: 'ApplicationModalController',
                resolve: {
                    application: function () {
                        return {};
                    },
                    isControlPanel: function () {
                        return false;
                    },
                    closeOnSave: function () {
                        return true;
                    }
                }
            });

            modalInstance.result.then(function (addedApp) {
                addedApp.isNew = true;
                $scope.mainApp = addedApp;
                $scope.mainApp.action = 1;
            });
        };
    })
    .controller('ConfigurationEditorController',
        function ($scope, configurationService, settingsService, $stateParams, $state, $rootScope, $window, $timeout,
                  localization, confirmModal, alertService, $modal, appVersionComparisonService) {

            $scope.successMessage = null;

            $scope.localizeRenewVersionTitle = function (application) {
                let localizedText = localization.localize('configuration.app.version.upgrade.message')
                    .replace('${installedVersion}', application.version)
                    .replace('${latestVersion}', application.latestVersionText);

                return localizedText;
            };

            $scope.filterApps = function (item) {
                var filter = ($scope.paging.filterText || '').toLowerCase();
                return (item.name && item.name.toLowerCase().indexOf(filter) >= 0) ||
                    (item.pkg && item.pkg.toLowerCase().indexOf(filter) >= 0)
            };

            $scope.addApp = function () {
                var modalInstance = $modal.open({
                    templateUrl: 'app/components/main/view/modal/addConfigurationApplication.html',
                    controller: 'AddConfigurationAppModalController',
                    resolve: {
                        applications: function () {
                            return allApplications;
                        },
                        configuration: function () {
                            return $scope.configuration;
                        }
                    }
                });

                modalInstance.result.then(function (addedApp) {
                    if (addedApp) {
                        addedApp.actionChanged = true;

                        if (addedApp.action == 1) {
                            $scope.applications.filter(function (app) {
                                return app.pkg === addedApp.pkg && (app.action == 1);
                            }).forEach(function (app) {
                                app.action = 0;
                            });
                        }
                        if (addedApp.isNew) {
                            allApplications.push(addedApp);
                        }
                        $scope.applications.push(addedApp);
                    }
                });
            };

            $scope.actionChanged = function (updatedApp) {
                updatedApp.actionChanged = true;
                if (updatedApp.action == 1) {
                    $scope.applications.filter(function (app) {
                        return updatedApp != app && app.pkg === updatedApp.pkg && (app.action == 1);
                    }).forEach(function (app) {
                        app.action = 0;
                    });
                }
            };

            $scope.upgradeApp = function (application) {
                let localizedText = localization.localize('question.app.upgrade')
                    .replace('${v1}', application.name)
                    .replace('${v2}', $scope.configuration.name);
                confirmModal.getUserConfirmation(localizedText, function () {
                    configurationService.upgradeConfigurationApplication(
                        {configurationId: $scope.configuration.id, applicationId: application.id}, function (response) {
                            if (response.status === 'OK') {
                                $scope.configuration.mainAppId = response.data.mainAppId;
                                $scope.configuration.contentAppId = response.data.contentAppId;

                                $scope.loadApps($scope.configuration.id);
                            } else {
                                alertService.showAlertMessage(localization.localize(response.message));
                            }
                        }, alertService.onRequestFailure);
                });
            };

            $scope.showIconSelectOptions = [
                {id: true, label: localization.localize('form.configuration.apps.label.show')},
                {id: false, label: localization.localize('form.configuration.apps.label.not.show')},
            ];

            $scope.isPermitOptionAvailable = function (application) {
                return application.system || !application.url || application.url.length === 0;
            };
            $scope.isProhibitOptionAvailable = function (application) {
                return true;
            };
            $scope.isInstallOptionAvailable = function (application) {
                return !(application.system || !application.url || application.url.length === 0);
            };
            $scope.isRemoveOptionAvailable = function (application) {
                return !application.system;
            };

            $scope.$on('$stateChangeStart',
                function (event, toState, toParams, fromState, fromParams) {
                    if ($scope.configurationForm.$dirty) {
                        if (!$scope.saved) {
                            var confirmed = confirm(localization.localize('question.exit.without.saving'));
                            if (!confirmed) {
                                event.preventDefault();
                            }
                        }
                    }
                });

            $scope.sortByChanged = function () {
                $scope.paging.currentPage = 1;
            };

            $scope.getApps = function (filter) {
                var lower = filter.toLowerCase();
                var apps = allApplications.filter(function (app) {
                    // Intentionally using app.action == 1 but not app.action === 1
                    return (app.action == 1) && (app.name.toLowerCase().indexOf(lower) > -1
                        || app.pkg && app.pkg.toLowerCase().indexOf(lower) > -1
                        || app.version && app.version.toLowerCase().indexOf(lower) > -1);
                });

                apps.sort(function (a, b) {
                    let n1 = a.name.toLowerCase();
                    let n2 = b.name.toLowerCase();

                    if (n1 === n2) {
                        return 0;
                    } else if (n1 < n2) {
                        return -1;
                    } else {
                        return 1;
                    }
                });

                return apps;
            };

            $scope.onMainAppSelected = function ($item) {
                $scope.mainApp = $item;
            };
            $scope.onContentAppSelected = function ($item) {
                $scope.contentApp = $item;
            };
            $scope.trackMainApp = function (val) {
                mainAppSelected = val;
            };
            $scope.trackContentApp = function (val) {
                contentAppSelected = val;
            };

            $scope.appLookupFormatter = function (val) {
                console.log('appLookupFormatter: val = ', val);
                return val.name + (val.version && val.version !== '0' ? " " + val.version : "");
            };

            var getAppSettingsApps = function (filter) {
                var lower = filter.toLowerCase();
                var apps = allApplications.filter(function (app) {
                    // Intentionally using app.action == 1 but not app.action === 1
                    return (app.name.toLowerCase().indexOf(lower) > -1
                        || app.pkg && app.pkg.toLowerCase().indexOf(lower) > -1
                        || app.version && app.version.toLowerCase().indexOf(lower) > -1);
                });

                apps.sort(function (a, b) {
                    let n1 = a.name.toLowerCase();
                    let n2 = b.name.toLowerCase();

                    if (n1 === n2) {
                        return 0;
                    } else if (n1 < n2) {
                        return -1;
                    } else {
                        return 1;
                    }
                });

                return apps;
            };

            $scope.getAppSettingsApps = getAppSettingsApps;

            $scope.onAppSettingsFilterAppSelected = function ($item) {
                $scope.settingsPaging.appSettingsFilterApp = $item;
                $scope.settingsPaging.appSettingsAppFilterText = $item.pkg;
                filterApplicationSettings();
            };

            $scope.appSettingsAppLookupFormatter = function (val) {
                if (val) {
                    return val.pkg;
                } else {
                    return null;
                }
            };

            $scope.appSettingsFilterChanged = function () {
                filterApplicationSettings();
            };

            $scope.systemAppsToggled = function () {
                $scope.showSystemApps = !$scope.showSystemApps;
                $scope.applications = allApplications.filter(function (app) {
                    return (app.actionChanged || app.action != '0') && (!app.system || $scope.showSystemApps);
                });
            };

            $scope.loadApps = function (configId) {
                configurationService.getApplications({"id": configId}, function (response) {
                    if (response.status === 'OK') {
                        response.data.forEach(function (app) {
                            app.actionChanged = false;
                        });

                        allApplications = response.data.map(function (app) {
                            return app;
                        });
                        $scope.applications = response.data.filter(function (app) {
                            // Application com.hmdm.launcher is made available by default when creating new configuration
                            return app.action != '0' && (!app.system || $scope.showSystemApps) || (!configId && app.pkg === 'com.hmdm.launcher' && app.action != '2');
                        });

                        // For new configuration use default app for main app and content receiver
                        if (!configId) {
                            let mainAppCandidates = response.data.filter(function (app) {
                                return app.pkg === 'com.hmdm.launcher' && app.action != '2';
                            });

                            if (mainAppCandidates.length > 0) {
                                $scope.configuration.mainAppId = mainAppCandidates[0].usedVersionId;
                                mainAppCandidates[0].action = 1; // Install
                            }
                        }

                        if ($scope.configuration.mainAppId) {
                            let mainApps = response.data.filter(function (app) {
                                return app.usedVersionId === $scope.configuration.mainAppId;
                            });

                            if (mainApps.length > 0) {
                                $scope.mainApp = mainApps[0];
                                mainAppSelected = true;
                            }
                        }

                        if ($scope.configuration.contentAppId) {
                            let contentApps = response.data.filter(function (app) {
                                return app.usedVersionId === $scope.configuration.contentAppId;
                            });

                            if (contentApps.length > 0) {
                                $scope.contentApp = contentApps[0];
                                contentAppSelected = true;
                            }
                        }
                    } else {
                        $scope.errorMessage = localization.localize(response.message);
                    }
                });
            };

            $scope.save = function (doClose, notifyDevices) {
                $scope.errorMessage = '';
                $scope.saved = false;

                if (!$scope.configuration.name) {
                    $scope.errorMessage = localization.localize('error.empty.configuration.name');
                } else if (!$scope.configuration.password) {
                    $scope.errorMessage = localization.localize('error.empty.configuration.password');
                } else if ($scope.configuration.kioskMode && (!contentAppSelected)) {
                    $scope.errorMessage = localization.localize('error.empty.configuration.contentApp');
                } else {
                    var request = {};

                    for (var prop in $scope.configuration) {
                        if ($scope.configuration.hasOwnProperty(prop)) {
                            request[prop] = $scope.configuration[prop];
                        }
                    }

                    if (mainAppSelected) {
                        var apps = allApplications.filter(function (app) {
                            // Intentionally using app.action == 1 but not app.action === 1
                            return (app.action == 1) && (app.usedVersionId === $scope.mainApp.usedVersionId);
                        });

                        if (apps.length === 0) {
                            $scope.errorMessage = localization.localize('error.invalid.configuration.mainApp');
                            return;
                        }

                        request["mainAppId"] = $scope.mainApp.usedVersionId;
                    } else {
                        request["mainAppId"] = null;
                    }

                    if (contentAppSelected) {
                        var apps = allApplications.filter(function (app) {
                            // Intentionally using app.action == 1 but not app.action === 1
                            return (app.action == 1) && (app.usedVersionId === $scope.contentApp.usedVersionId);
                        });

                        if (apps.length === 0) {
                            $scope.errorMessage = localization.localize('error.invalid.configuration.contentApp');
                            return;
                        }

                        request["contentAppId"] = $scope.contentApp.usedVersionId;
                    } else {
                        request["contentAppId"] = null;
                    }

                    var applications = allApplications.filter(function (app) {
                        // Intentionally using app.action != 0 but not app.action !== 0
                        return app.action != 0;
                    });

                    request.applications = applications;
                    request.type = $scope.isTypical ? 1 : 0;

                    if ($scope.configuration.systemUpdateType === 2) {
                        request.systemUpdateFrom = pad($scope.dates.systemUpdateFrom.getHours(), 2) + ':' + pad($scope.dates.systemUpdateFrom.getMinutes(), 2);
                        request.systemUpdateTo = pad($scope.dates.systemUpdateTo.getHours(), 2) + ':' + pad($scope.dates.systemUpdateTo.getMinutes(), 2);
                    }

                    configurationService.updateConfiguration(request, function (response) {
                        if (response.status === 'OK') {
                            $scope.saved = true;
                            if (doClose) {
                                $rootScope["configurationsMessage"] = localization.localize('success.configuration.saved');
                                $scope.close();
                            } else {
                                $scope.successMessage = localization.localize('success.configuration.saved');
                                $scope.configuration = response.data;

                                $scope.loadApps($scope.configuration.id);
                                $scope.configurationForm.$dirty = false;
                                let $timeout1 = $timeout(function () {
                                    $scope.successMessage = null;
                                }, 5000);
                                $scope.$on('$destroy', function () {
                                    $timeout.cancel($timeout1);
                                });

                                filterApplicationSettings();
                            }

                            if (notifyDevices) {
                                configurationService.notifyDevicesOnUpdate({id: $scope.configuration.id}, function (response) {
                                    if (response.status === "OK") {
                                        $scope.successMessage = localization.localize('success.config.update.notification');
                                        let $timeout1 = $timeout(function () {
                                            $scope.successMessage = null;
                                        }, 5000);
                                        $scope.$on('$destroy', function () {
                                            $timeout.cancel($timeout1);
                                        });
                                    }
                                });
                            }
                        } else {
                            $scope.errorMessage = localization.localize(response.message);
                        }
                    }, function () {
                        $scope.errorMessage = localization.localize('error.request.failure');
                    });
                }
            };

            $scope.close = function () {
                $state.transitionTo('configurations');
                // $window.close();
            };

            $scope.addApplicationSetting = function () {
                var modalInstance = $modal.open({
                    templateUrl: 'app/components/main/view/modal/applicationSetting.html',
                    controller: 'ApplicationSettingEditorController',
                    resolve: {
                        applicationSetting: function () {
                            return {type: "STRING"};
                        },
                        getApps: function () {
                            return getAppSettingsApps;
                        }
                    }
                });

                modalInstance.result.then(function (applicationSetting) {
                    if (!applicationSetting.id) {
                        applicationSetting.tempId = new Date().getTime();
                        $scope.configuration.applicationSettings.push(applicationSetting);
                        filterApplicationSettings();
                    }
                });
            };

            var mergeApplicationUsageParameters = function (newApplicationUsageParameters) {
                var appParametersIndex = $scope.configuration.applicationUsageParameters.findIndex(function (item) {
                    return item.applicationId === newApplicationUsageParameters.applicationId;
                });

                if (appParametersIndex < 0) {
                    $scope.configuration.applicationUsageParameters.push(newApplicationUsageParameters);
                } else {
                    $scope.configuration.applicationUsageParameters[appParametersIndex] = newApplicationUsageParameters;
                }
            };

            $scope.selectVersion = function (application) {
                var modalInstance = $modal.open({
                    templateUrl: 'app/components/main/view/modal/configurationAppVersionSelection.html',
                    controller: 'ConfigurationAppVersionSelectController',
                    resolve: {
                        application: function () {
                            return application;
                        },
                        applicationParameters: function () {
                            return $scope.configuration.applicationUsageParameters.find(function (item) {
                                return item.applicationId === application.id;
                            });
                        },
                    }
                });

                modalInstance.result.then(function (data) {
                    var selectedAppVersion = data.selectedVersion;
                    var applicationVersions = data.availableVersions;



                    var newAppVersion = applicationVersions.filter(function (item) {
                        return item.id === selectedAppVersion.applicationVersionId;
                    })[0];

                    var currentAppVersion = applicationVersions.filter(function (item) {
                        return item.id === application.usedVersionId;
                    })[0];

                    // Compare new version and existing one
                    var comparisonResult = appVersionComparisonService.compare(newAppVersion.version, currentAppVersion.version);

                    if (comparisonResult > 0) { // Upgrade
                        let localizedText = localization.localize('form.configuration.app.version.select.upgrade.warning')
                            .replace('${v1}', application.name)
                            .replace('${v3}', newAppVersion.version)
                            .replace('${v2}', $scope.configuration.name);
                        
                        confirmModal.getUserConfirmation(localizedText, function () {
                            mergeApplicationUsageParameters(data.applicationParameters);

                            allApplications.filter(function (app) {
                                return app.id === newAppVersion.applicationId && (app.action == 1);
                            }).forEach(function (app) {
                                app.usedVersionId = newAppVersion.id;
                                app.version = newAppVersion.version;
                                app.url = newAppVersion.url;
                                app.outdated = newAppVersion.id !== app.latestVersion;
                            });

                            allApplications = allApplications.filter(function (app) {
                                return app.id !== newAppVersion.applicationId  || app.action == 1 || app.usedVersionId !== newAppVersion.id;
                            });

                            allApplications.sort(function (a, b) {
                                return appVersionComparisonService.compare(a.version, b.version)
                            });

                            $scope.applications = allApplications.filter(function (app) {
                                return (app.actionChanged || app.action != '0') && (!app.system || $scope.showSystemApps);
                            });

                            syncMainApp();
                            syncContentApp();
                        });
                    } else if (comparisonResult < 0) { // Downgrade
                        let localizedText = localization.localize('form.configuration.app.version.select.downgrade.warning')
                            .replace('${v1}', application.name)
                            .replace('${v2}', newAppVersion.version);
                        
                        confirmModal.getUserConfirmation(localizedText, function () {
                            mergeApplicationUsageParameters(data.applicationParameters);
                            applicationVersions.forEach(function (availableAppVersion) {
                                var result1 = appVersionComparisonService.compare(
                                    newAppVersion.version, availableAppVersion.version
                                );
                                if (result1 < 0) {
                                    var result2 = appVersionComparisonService.compare(
                                        availableAppVersion.version, currentAppVersion.version
                                    );
                                    if (result2 <= 0) {
                                        var alreadyListed = false;
                                        allApplications.filter(function (app) {
                                            return app.id === newAppVersion.applicationId && (app.usedVersionId === availableAppVersion.id);
                                        }).forEach(function (app) {
                                            alreadyListed = true;
                                            app.action = 2;
                                        });

                                        if (!alreadyListed) {
                                            var copy = {};
                                            for (var p in application) {
                                                if (application.hasOwnProperty(p)) {
                                                    copy[p] = application[p];
                                                }
                                            }

                                            copy.version = availableAppVersion.version;
                                            copy.usedVersionId = availableAppVersion.id;
                                            copy.action = 2;
                                            delete copy.$$hashKey;

                                            allApplications.push(copy);
                                        }
                                    }
                                }
                            });

                            var copy = {};
                            for (var p in application) {
                                if (application.hasOwnProperty(p)) {
                                    copy[p] = application[p];
                                }
                            }

                            copy.version = newAppVersion.version;
                            copy.usedVersionId = newAppVersion.id;
                            copy.action = 1;
                            delete copy.$$hashKey;

                            allApplications.push(copy);

                            allApplications = allApplications.filter(function (app) {
                                return app.id !== newAppVersion.applicationId  || app.action == 1 || app.usedVersionId !== newAppVersion.id;
                            });

                            allApplications.sort(function (a, b) {
                                return appVersionComparisonService.compare(a.version, b.version)
                            });

                            $scope.applications = allApplications.filter(function (app) {
                                return (app.actionChanged || app.action != '0') && (!app.system || $scope.showSystemApps);
                            });

                            syncMainApp();
                            syncContentApp();

                        });
                    } else {
                        mergeApplicationUsageParameters(data.applicationParameters);
                    }
                });
            };

            var syncMainApp = function () {
                if ($scope.configuration.mainAppId) {
                    let mainAppInstalledVersion = $scope.applications.find(function (app) {
                        return app.id === $scope.mainApp.id && app.action == 1;
                    });

                    if (mainAppInstalledVersion) {
                        var copy = {};
                        for (var p in mainAppInstalledVersion) {
                            if (mainAppInstalledVersion.hasOwnProperty(p)) {
                                copy[p] = mainAppInstalledVersion[p];
                            }
                        }
                        $scope.mainApp = copy;
                        mainAppSelected = true;
                    }
                }
            };

            var syncContentApp = function () {
                if ($scope.configuration.contentAppId) {
                    let contentAppInstalledVersion = $scope.applications.find(function (app) {
                        return app.id === $scope.contentApp.id && app.action == 1;
                    });

                    if (contentAppInstalledVersion) {
                        var copy = {};
                        for (var p in contentAppInstalledVersion) {
                            if (contentAppInstalledVersion.hasOwnProperty(p)) {
                                copy[p] = contentAppInstalledVersion[p];
                            }
                        }
                        $scope.contentApp = copy;
                        contentAppSelected = true;
                    }
                }
            };

            $scope.editApplicationSetting = function (setting) {
                var modalInstance = $modal.open({
                    templateUrl: 'app/components/main/view/modal/applicationSetting.html',
                    controller: 'ApplicationSettingEditorController',
                    resolve: {
                        applicationSetting: function () {
                            return setting;
                        },
                        getApps: function () {
                            return getAppSettingsApps;
                        }
                    }
                });

                modalInstance.result.then(function (applicationSetting) {
                    var index = $scope.configuration.applicationSettings.findIndex(function (item) {
                        if (item.id) {
                            return item.id === applicationSetting.id;
                        } else if (item.tempId) {
                            return item.tempId === applicationSetting.tempId;
                        } else {
                            return false;
                        }
                    });

                    if (index >= 0) {
                        $scope.configuration.applicationSettings[index] = applicationSetting;
                        filterApplicationSettings();
                    }
                });
            };

            $scope.removeApplicationSetting = function (applicationSetting) {
                var index = $scope.configuration.applicationSettings.findIndex(function (item) {
                    if (item.id) {
                        return item.id === applicationSetting.id;
                    } else if (item.tempId) {
                        return item.tempId === applicationSetting.tempId;
                    } else {
                        return false;
                    }
                });

                if (index >= 0) {
                    $scope.configuration.applicationSettings.splice(index, 1);
                    filterApplicationSettings();
                }
            };

            var filterApplicationSettings = function () {
                $scope.applicationSettings = $scope.configuration.applicationSettings.filter(function (item) {
                    var valid = true;
                    if ($scope.settingsPaging.appSettingsFilterText && $scope.settingsPaging.appSettingsFilterText.length > 0) {
                        var lower = $scope.settingsPaging.appSettingsFilterText.toLowerCase();

                        valid = (item.name !== null) && (item.name !== undefined) && item.name.toLowerCase().indexOf(lower) > -1
                            || (item.value !== null) && (item.value !== undefined) && item.value.toLowerCase().indexOf(lower) > -1
                            || (item.comment !== null) && ((item.comment !== undefined)) && item.comment.toLowerCase().indexOf(lower) > -1
                    }

                    if (valid) {
                        if ($scope.settingsPaging.appSettingsFilterApp && $scope.settingsPaging.appSettingsFilterApp.id) {
                            valid = item.applicationId === $scope.settingsPaging.appSettingsFilterApp.id;
                        } else if (typeof $scope.settingsPaging.appSettingsFilterApp === "string") {
                            valid = item.applicationPkg.toLowerCase().indexOf($scope.settingsPaging.appSettingsFilterApp.toLowerCase(0)) > -1;
                        }
                    }

                    return valid;
                });
            };

            function pad(num, size) {
                var s = num + "";
                while (s.length < size) s = "0" + s;
                return s;
            }

            // Entry point
            var configId = $stateParams.id;
            setTimeout(function () {
                angular.element(document.querySelector('#djsedfujh')).attr('type', 'password');
            }, 300);

            var mainAppSelected = false;
            var contentAppSelected = false;
            var allApplications;

            $scope.configuration = {};
            $scope.isTypical = ($stateParams.typical === 'true');
            $scope.saved = false;
            $scope.showSystemApps = true;

            var d1 = new Date();
            d1.setHours(0);
            d1.setMinutes(0);

            var d2 = new Date();
            d2.setHours(23);
            d2.setMinutes(59);

            $scope.dates = {};

            if (configId) {
                configurationService.getById({"id": configId}, function (response) {
                    if (response.data) {
                        $scope.configuration = response.data;

                        filterApplicationSettings();

                        if (response.data.systemUpdateType === 2) {
                            try {
                                if (response.data.systemUpdateFrom) {
                                    var time = response.data.systemUpdateFrom;
                                    var pos = time.indexOf(':');
                                    if (pos > -1) {
                                        d1.setHours(parseInt(time.substring(0, pos)));
                                        d1.setMinutes(parseInt(time.substring(pos + 1)));
                                    }
                                }
                                if (response.data.systemUpdateTo) {
                                    var time = response.data.systemUpdateTo;
                                    var pos = time.indexOf(':');
                                    if (pos > -1) {
                                        d2.setHours(parseInt(time.substring(0, pos)));
                                        d2.setMinutes(parseInt(time.substring(pos + 1)));
                                    }
                                }
                            } catch (e) {
                                console.error('Failed to parse system update times from server', e);
                            }
                        }

                        $scope.dates.systemUpdateFrom = d1;
                        $scope.dates.systemUpdateTo = d2;
                    }
                });
            } else {
                $scope.dates.systemUpdateFrom = d1;
                $scope.dates.systemUpdateTo = d2;
                $scope.configuration.eventReceivingComponent = 'com.hmdm.launcher.AdminReceiver';
                $scope.configuration.systemUpdateType = 0;
            }

            $scope.selected = {id: ''};

            $scope.paging = {
                currentPage: 1,
                pageSize: 50,
                filterText: ''
            };

            $scope.settingsPaging = {
                currentPage: 1,
                pageSize: 50,
                appSettingsAppFilterText: '',
                appSettingsFilterText: '',
                appSettingsFilterApp: null
            };

            $scope.$watch('paging.currentPage', function () {
                $window.scrollTo(0, 0);
            });
            $scope.$watch('settingsPaging.currentPage', function () {
                $window.scrollTo(0, 0);
            });

            $scope.mainApp = {id: -1, name: ""};
            $scope.contentApp = {id: -1, name: ""};

            if (!configId) {
                $scope.configuration.useDefaultDesignSettings = true;
                // settingsService.getSettings(function (response) {
                //     if (response.data) {
                //         $scope.configuration.backgroundColor = response.data.backgroundColor;
                //         $scope.configuration.textColor = response.data.textColor;
                //         $scope.configuration.backgroundImageUrl = response.data.backgroundImageUrl;
                //         $scope.configuration.iconSize = response.data.iconSize;
                //         $scope.configuration.desktopHeader = response.data.desktopHeader;
                //     }
                // });
            }

            $scope.loadApps(configId);
        })
    .controller('ConfigurationAppVersionSelectController', function ($scope, $modalInstance, applicationService,
                                                                     localization, application, applicationParameters) {

        $scope.errorMessage = undefined;
        $scope.application = application;
        $scope.versions = [];

        var applicationParametersCopy = {
            applicationId: application.id,
            skipVersionCheck: false
        };
        if (applicationParameters) {
            for (var p in applicationParameters) {
                if (applicationParameters.hasOwnProperty(p)) {
                    applicationParametersCopy[p] = applicationParameters[p];
                }
            }
        }

        $scope.applicationParameters = applicationParametersCopy;

        $scope.usedVersion = {
            applicationVersionId: application.usedVersionId
        };

        applicationService.getApplicationVersions({id: application.id}, function (response) {
            if (response.status === 'OK') {
                $scope.versions = response.data;
            } else {
                $scope.errorMessage = localization.localize(response.message);
            }
        }, function () {
            $scope.errorMessage = localization.localize('error.request.failure')
        });

        $scope.closeModal = function () {
            $modalInstance.dismiss();
        };

        $scope.save = function () {
            $modalInstance.close({
                selectedVersion: $scope.usedVersion,
                availableVersions: $scope.versions,
                applicationParameters: $scope.applicationParameters
            });
        };
    })
;