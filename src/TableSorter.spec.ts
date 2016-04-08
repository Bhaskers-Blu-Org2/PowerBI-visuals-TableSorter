import "../base/testSetup";

import { expect } from "chai";
import { TableSorter } from "./TableSorter";
import { ITableSorterSettings, ITableSorterRow, IDataProvider } from "./models";
import * as $ from "jquery";
import { Promise } from "es6-promise";

describe("TableSorter", () => {
    let parentEle: JQuery;
    beforeEach(() => {
        parentEle = $("<div></div>");
    });

    afterEach(() => {
        if (parentEle) {
            parentEle.remove();
        }
        parentEle = undefined;
    });

    let createInstance = () => {
        let ele = $("<div>");
        parentEle.append(ele);
        let result = {
            instance: new TableSorter(ele),
            element: ele,
        };
        result.instance.settings = {
            presentation: {
                animation: false
            },
        };
        return result;
    };

    let createFakeData = () => {
        let rows: ITableSorterRow[] = [];
        for (let i = 0; i < 100; i++) {
            (function(myId: any) {
                rows.push({
                    id: myId,
                    col1: myId,
                    col2: i * (Math.random() * 100),
                    selected: false,
                    equals: (other) => (myId) === other["col1"],
                });
            })("FAKE_" + i);
        }
        return {
            data: rows,
            columns: [{
                /**
                 * The field name of the column
                 */
                column: "col1",

                /**
                 * The displayName for the column
                 */
                label: "Column",

                /**
                 * The type of column it is
                 * values: string|number
                 */
                type: "string",
            }, ],
        };
    };

    let createProvider = (data: any[]) => {
        let resolver: Function;
        let fakeProvider = <IDataProvider>{
            canQuery(options: any) {
                return Promise.resolve(true);
            },
            generateHistogram() {
                return Promise.resolve([]);
            },
            query(options: any) {
                return new Promise((resolve2) => {
                    resolve2({
                        total: data.length,
                        results: data,
                    });
                    setTimeout(function() {
                        resolver();
                    }, 0);
                });
            },
        };
        return {
            dataLoaded : new Promise((resolve) => {
                resolver = resolve;
            }),
            provider: fakeProvider,
        };
    };

    let loadInstanceWithStackedColumns = () => {
        let { instance, element } = createInstance();
        let data = createFakeData();
        let providerInfo = createProvider(data.data);
        instance.dataProvider = providerInfo.provider;
        providerInfo.dataLoaded.then(() => {
            let desc = {
                label: "STACKED_COLUMN",
                width: 10,
                children: [
                    { column: "col2", type: "number", weight: 100 }
                ],
            };
            let inst = instance.lineupImpl;
            inst.storage.addStackedColumn(desc);
            inst.headerUpdateRequired = true;
            inst.updateAll();
        });
        return {
            instance,
            element,
            data,
            dataLoaded: providerInfo.dataLoaded,
        };
    };

    const performClick = (e: JQuery) => {
        if (typeof MouseEvent !== "undefined") {
            /* tslint:disable */
            var ev = new Event("click", {"bubbles":true, "cancelable":false});
            e[0].dispatchEvent(ev);
            /* tslint:enable */
        } else {
            e.click();
        }
     };

    let loadInstanceWithStackedColumnsAndClick = () => {
        let { instance, element, data, dataLoaded } = loadInstanceWithStackedColumns();

        dataLoaded.then(() => {
            let headerEle = element.find(".header:contains('STACKED_COLUMN')").find(".labelBG");
            performClick(headerEle);
        });

        return {
            instance,
            element,
            data,
            dataLoaded,
        };
    };

    let loadInstanceWithSettings = (settings: ITableSorterSettings) => {
        let { instance, element } = createInstance();
        let { data } = createFakeData();

        let { provider, dataLoaded } = createProvider(data);

        instance.dataProvider = provider;

        // Set the settings
        instance.settings = $.extend(true, {}, settings, {
            presentation: {
                animation: false
            },
        });

        return {
            instance,
            element,
            dataLoaded,
        };
    };

    it("should load", function() {
        let { instance } = createInstance();
        expect(instance).to.not.be.undefined;
    });

    describe("settings", () => {
        it("should load some default settings on create", () => {
            let { instance } = createInstance();
            expect(instance.settings).to.not.be.undefined;
        });
        it("should load some merge new settings", () => {
            let { instance } = createInstance();
            let newSettings: ITableSorterSettings = {
                presentation: {
                    histograms: false
                },
            };

            // Set the new settings
            instance.settings = newSettings;

            // Make sure that something that wasn't touched is still there
            expect(instance.settings.presentation.values).to.equal(false);

            // Make sure our new value is still there
            expect(instance.settings.presentation.histograms).to.eq(false);
        });
        it("should pass rendering settings to lineupimpl", () => {
            let { instance, dataLoaded } = loadInstanceWithSettings({
                presentation: {
                    histograms: false
                },
            });

            return dataLoaded.then(() => {
                expect(instance.lineupImpl.config.renderingOptions.histograms).to.be.false;
            });
        });
    });

    describe("settings", () => {
        it("multiSelect should be true by default", () => {
            let { instance } = createInstance();
            expect(instance.settings.selection.multiSelect).to.be.false;
        });
        it("singleSelect should be true by default", () => {
            let { instance } = createInstance();
            expect(instance.settings.selection.singleSelect).to.be.true;
        });
    });

    describe("events", () => {

        describe("sortChanged", () => {
            it("should call the event when a column header is clicked", () => {
                let { instance, element } = createInstance();
                let called = false;
                instance.events.on(TableSorter.EVENTS.SORT_CHANGED, (item: any) => {
                    called = true;
                });
                let providerInfo = createProvider(createFakeData().data);
                instance.dataProvider = providerInfo.provider;
                return providerInfo.dataLoaded.then(() => {
                    // Click on de header
                    let headerEle = element.find(".header:contains('col1')").find(".labelBG");
                    performClick(headerEle);

                    expect(called).to.be.true;
                });
            });

            it("should call the event with the correct params", () => {
                let { instance, element } = createInstance();
                instance.events.on(TableSorter.EVENTS.SORT_CHANGED, (colName: string) => {
                    expect(colName).to.equal("col1");
                });

                let providerInfo = createProvider(createFakeData().data);
                instance.dataProvider = providerInfo.provider;
                return providerInfo.dataLoaded.then(() => {
                    // Click on de header
                    let headerEle = element.find(".header:contains('col1')").find(".labelBG");
                    performClick(headerEle);
                });
            });
        });

        describe("selectionChanged", () => {
            it("should call the event when a row is clicked", () => {
                let { instance, element } = createInstance();
                let called = false;
                instance.events.on(TableSorter.EVENTS.SELECTION_CHANGED, (selection: any) => {
                    called = true;
                    expect(selection.length).to.be.equal(1);
                    expect(selection[0].col1).to.be.equal("FAKE_0"); // Very first row
                });

                let providerInfo = createProvider(createFakeData().data);
                instance.dataProvider = providerInfo.provider;
                return providerInfo.dataLoaded.then(() => {
                    let row = element.find(".row").first();
                    performClick(row);
                    expect(called).to.be.true;
                });

            });
            it("should call the event when a row is clicked twice", () => {
                let { instance, element } = createInstance();

                let providerInfo = createProvider(createFakeData().data);
                instance.dataProvider = providerInfo.provider;
                return providerInfo.dataLoaded.then(() => {
                    let row = element.find(".row").first();
                    performClick(row);

                    let called = false;
                    instance.events.on(TableSorter.EVENTS.SELECTION_CHANGED, (selection: any) => {
                        called = true;
                        expect(selection.length).to.be.equal(0);
                    });

                    performClick(row);

                    expect(called).to.be.true;
                });

            });
        });

        describe("selection", () => {
            describe("multi", () => {
                it("should update when a row is clicked on", () => {
                    let { instance, element } = createInstance();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.dataLoaded.then(() => {
                        let row = element.find(".row").first();
                        performClick(row);

                        expect(instance.selection[0]["col1"]).to.be.equal(data[0]["col1"]);
                    });

                });

                it("should deselect a row that was selected twice", () => {
                    let { instance, element } = createInstance();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.dataLoaded.then(() => {
                        let row = element.find(".row").first();
                        performClick(row);
                        performClick(row);

                        expect(instance.selection.length).to.be.equal(0);
                    });
                });

                it("should select multiple rows", () => {
                    let { instance, element } = loadInstanceWithSettings({
                        selection: {
                            singleSelect: false,
                            multiSelect: true,
                        },
                    });
                    let { data } = createFakeData();
                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.dataLoaded.then(() => {
                        let rows = element.find(".row");
                        performClick($(rows[0]));
                        performClick($(rows[1]));

                        expect(instance.selection.length).to.be.equal(2);
                        expect(instance.selection.map((row) => row["col1"])).to.be.deep.equal(data.slice(0, 2).map((r) => r["col1"]));
                    });

                });

                it("should retain selection when set", () => {
                    let { instance } = createInstance();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.dataLoaded.then(() => {
                        instance.selection = [data[0]];
                        expect(instance.selection[0]["col1"]).to.be.equal(data[0]["col1"]);
                    });
                });
            });

            describe("single", () => {
                let createInstanceWithSingleSelect = () => {
                    return loadInstanceWithSettings({
                        selection: {
                            singleSelect: true,
                            multiSelect: false,
                        },
                    });
                };
                it("should update when a row is clicked on", () => {
                    let { instance, element } = createInstanceWithSingleSelect();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.dataLoaded.then(() => {
                        let row = element.find(".row").first();
                        performClick(row);

                        expect(instance.selection[0]["col1"]).to.be.equal(data[0]["col1"]);
                    });
                });

                it("should deselect a row that was selected twice", () => {
                    let { instance, element } = createInstanceWithSingleSelect();

                    let providerInfo = createProvider(createFakeData().data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.dataLoaded.then(() => {
                        let row = element.find(".row").first();
                        performClick(row);
                        performClick(row);

                        expect(instance.selection.length).to.be.equal(0);
                    });
                });

                it("should select the last row when multiple rows are clicked", () => {
                    let { instance, element } = createInstanceWithSingleSelect();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.dataLoaded.then(() => {

                        let rows = element.find(".row");
                        performClick($(rows[0]));
                        performClick($(rows[1]));

                        expect(instance.selection.length).to.be.equal(1);
                        expect(instance.selection[0]["col1"]).to.be.deep.equal(data[1]["col1"]);
                    });
                });

                it("should retain selection when set", () => {
                    let { instance } = createInstanceWithSingleSelect();
                    let { data } = createFakeData();

                    let providerInfo = createProvider(data);
                    instance.dataProvider = providerInfo.provider;
                    return providerInfo.dataLoaded.then(() => {
                        instance.selection = [data[0]];
                        expect(instance.selection[0]["col1"]).to.be.equal(data[0]["col1"]);
                    });
                });
            });
        });

        describe("getSortFromLineUp", () => {
            it("does not crash when sorting a stacked column", () => {
                let {instance, dataLoaded} = loadInstanceWithStackedColumnsAndClick();
                return dataLoaded.then(() => {
                    expect(instance.getSortFromLineUp()).not.to.throw;
                });
            });

            it("returns a 'stack' property when a stack is cliked on", () => {
                let {instance, dataLoaded} = loadInstanceWithStackedColumnsAndClick();
                return dataLoaded.then(() => {
                    let result = instance.getSortFromLineUp();
                    expect(result.stack.name).to.equal("STACKED_COLUMN");
                    expect(result.column).to.be.undefined;
                });
            });
        });

        describe("integration", () => {
            it("saves the configuration when a stacked column is sorted", () => {
                let {instance, dataLoaded} = loadInstanceWithStackedColumnsAndClick();
                return dataLoaded.then(() => {
                    expect(instance.configuration.sort).to.not.be.undefined;
                    expect(instance.configuration.sort.stack.name).to.be.equal("STACKED_COLUMN");
                    expect(instance.configuration.sort.column).to.be.undefined;
                });
            });
            it("saves the configuration when the column layout has been changed", () => {
                let {instance, dataLoaded } = loadInstanceWithStackedColumns();
                return dataLoaded.then(() => {
                    let called = false;
                    instance.events.on(TableSorter.EVENTS.CONFIG_CHANGED, () => {
                        called = true;
                    });

                    // Ghetto: Manually say that the columns have changed, usually happens if you drag/drop add columns
                    instance.lineupImpl.listeners["columns-changed"]();

                    expect(called).to.be.true;
                });
            });
            it("loads lineup with a sorted stacked column", () => {
                let {instance, data, dataLoaded } = loadInstanceWithStackedColumns();
                return dataLoaded.then(() => {
                    instance.configuration = {
                        primaryKey: "col1",
                        columns: data.columns,
                        sort: {
                            stack: {
                                name: "STACKED_COLUMN"
                            },
                            asc: true,
                        },
                    };
                    let result = instance.getSortFromLineUp();
                    expect(result.stack.name).to.equal("STACKED_COLUMN");
                    expect(result.column).to.be.undefined;
                });
            });
        });
    });
});
