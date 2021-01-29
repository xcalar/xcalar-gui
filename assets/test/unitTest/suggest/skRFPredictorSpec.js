describe('skRFPredictor', function() {
    describe('Decision Tree', function() {
        /* Following line was generated *deterministically* with following code:
         * (in python terminal in directory xcalar-gui/assets/js/suggest)
         * >>> import makeSKLearnModel
         * >>> from sklearn.datasets import load_iris
         * >>> iris = load_iris()
         * >>> makeDTStr(iris.data, iris.target)
         * ADDENDA: Be sure to remove modelMeta of RFStr and just stringify
         * the "model" field
        */
        var irisDTStr = '{"children_right": [2, -1, 12, 7, 6, -1, -1, 9, -1, 11, -1, -1, 16, 15, -1, -1, -1], "feature": [3, -2, 3, 2, 3, -2, -2, 3, -2, 2, -2, -2, 2, 1, -2, -2, -2], "value": [[[50.0, 50.0, 50.0]], [[50.0, 0.0, 0.0]], [[0.0, 50.0, 50.0]], [[0.0, 49.0, 5.0]], [[0.0, 47.0, 1.0]], [[0.0, 47.0, 0.0]], [[0.0, 0.0, 1.0]], [[0.0, 2.0, 4.0]], [[0.0, 0.0, 3.0]], [[0.0, 2.0, 1.0]], [[0.0, 2.0, 0.0]], [[0.0, 0.0, 1.0]], [[0.0, 1.0, 45.0]], [[0.0, 1.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 43.0]]], "children_left": [1, -1, 3, 4, 5, -1, -1, 8, -1, 10, -1, -1, 13, 14, -1, -1, -1], "threshold": [0.800000011920929, -2.0, 1.75, 4.949999809265137, 1.6500000953674316, -2.0, -2.0, 1.5499999523162842, -2.0, 5.449999809265137, -2.0, -2.0, 4.850000381469727, 3.0999999046325684, -2.0, -2.0, -2.0], "node_count": 17}';
        var dtModel;

        it('DTModel should work', function() {
            dtModel = new skRFPredictor.__testOnly__.DTModel(irisDTStr);
        });

        it('DTModel.parseModel should work', function() {
            // This is currently already implicitly tested in previous test
            dtModel.parseModel(irisDTStr);
        });

        it('DTModel.isValidTree should work', function() {
            expect(dtModel.isValidTree(irisDTStr)).to.be.true;
        });

        it('DTModel.getNodeState should work', function() {
            expect(dtModel.getNodeState(0)).to.be.equal(
                skRFPredictor.__testOnly__.skNodeState.Node);
            expect(dtModel.getNodeState(1)).to.be.equal(
                skRFPredictor.__testOnly__.skNodeState.Leaf);
        });

        it('DTModel.isLeaf should work', function() {
            expect(dtModel.isLeaf(0)).to.be.false;
            expect(dtModel.isLeaf(1)).to.be.true;
        });

        it('DTModel.apply_ should work', function() {
            expect(dtModel.apply_([3,3,3,3])).to.be.equal(14);
        });

        it('DTModel.getClassByClassIdx should work', function() {
            // This function is currently identity, so no test needed now.
        });

        it('DTModel.getScores should work', function() {
            var nodeProbs;
            for (i = 0; i < dtModel.node_count; i++) {
                // TODO: When add class stats to model, ensure # classes all eq
                nodeProbs = dtModel.getScores(i);
                var totalProb = 0;
                for (j = 0; j < nodeProbs.length; j++) {
                    expect(nodeProbs[j]).to.be.at.most(1);
                    expect(nodeProbs[j]).to.be.at.least(0);
                    totalProb += nodeProbs[j];
                }
                // TODO: May want to add a "within epsilon" account for rounding
                expect(totalProb).to.be.equal(1);
            }
        });

        it('DTModel.predict_proba should work', function() {
            var probs = dtModel.predict_proba([3,3,3,3]);
            expect(probs[0]).to.equal(0);
            expect(probs[1]).to.equal(0);
            expect(probs[2]).to.equal(1);
        });

        it('DTModel.predict should work', function() {
            var pred = dtModel.predict([3,3,3,3]);
            expect(pred.classIdx).to.equal(2);
            expect(pred.score).to.equal(1);
        });
    });

    describe('Random Forest', function() {
        /* Following line was generated *deterministically* with following code:
         * (in python terminal in directory xcalar-gui/assets/js/suggest)
         * >>> import makeSKLearnModel
         * >>> from sklearn.datasets import load_iris
         * >>> iris = load_iris()
         * >>> makeRFStr(iris.data, iris.target)
         * ADDENDA: Be sure to remove modelMeta of RFStr and just stringify
         * the "model" field
        */
        var irisRFStr = '{"estimators_": [{"children_right": [2, -1, 8, 5, -1, 7, -1, -1, 10, -1, 12, -1, -1], "feature": [3, -2, 2, 3, -2, 1, -2, -2, 0, -2, 2, -2, -2], "value": [[[47.0, 44.0, 59.0]], [[47.0, 0.0, 0.0]], [[0.0, 44.0, 59.0]], [[0.0, 43.0, 3.0]], [[0.0, 42.0, 0.0]], [[0.0, 1.0, 3.0]], [[0.0, 0.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 1.0, 56.0]], [[0.0, 0.0, 27.0]], [[0.0, 1.0, 29.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 29.0]]], "children_left": [1, -1, 3, 4, -1, 6, -1, -1, 9, -1, 11, -1, -1], "threshold": [0.75, -2.0, 4.850000381469727, 1.6500000953674316, -2.0, 3.0, -2.0, -2.0, 6.599999904632568, -2.0, 5.199999809265137, -2.0, -2.0], "node_count": 13}, {"children_right": [2, -1, 10, 5, -1, 9, 8, -1, -1, -1, 14, 13, -1, -1, -1], "feature": [3, -2, 3, 2, -2, 2, 1, -2, -2, -2, 2, 1, -2, -2, -2], "value": [[[46.0, 62.0, 42.0]], [[46.0, 0.0, 0.0]], [[0.0, 62.0, 42.0]], [[0.0, 61.0, 5.0]], [[0.0, 58.0, 0.0]], [[0.0, 3.0, 5.0]], [[0.0, 3.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 3.0, 0.0]], [[0.0, 0.0, 3.0]], [[0.0, 1.0, 37.0]], [[0.0, 1.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 35.0]]], "children_left": [1, -1, 3, 4, -1, 6, 7, -1, -1, -1, 11, 12, -1, -1, -1], "threshold": [0.800000011920929, -2.0, 1.75, 4.949999809265137, -2.0, 5.449999809265137, 2.450000047683716, -2.0, -2.0, -2.0, 4.850000381469727, 3.0999999046325684, -2.0, -2.0, -2.0], "node_count": 15}, {"children_right": [6, 3, -1, 5, -1, -1, 12, 9, -1, 11, -1, -1, 14, -1, 18, 17, -1, -1, -1], "feature": [0, 3, -2, 3, -2, -2, 3, 3, -2, 2, -2, -2, 2, -2, 3, 2, -2, -2, -2], "value": [[[51.0, 46.0, 53.0]], [[49.0, 12.0, 1.0]], [[49.0, 0.0, 0.0]], [[0.0, 12.0, 1.0]], [[0.0, 12.0, 0.0]], [[0.0, 0.0, 1.0]], [[2.0, 34.0, 52.0]], [[2.0, 32.0, 1.0]], [[2.0, 0.0, 0.0]], [[0.0, 32.0, 1.0]], [[0.0, 32.0, 0.0]], [[0.0, 0.0, 1.0]], [[0.0, 2.0, 51.0]], [[0.0, 1.0, 0.0]], [[0.0, 1.0, 51.0]], [[0.0, 1.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 3.0]], [[0.0, 0.0, 48.0]]], "children_left": [1, 2, -1, 4, -1, -1, 7, 8, -1, 10, -1, -1, 13, -1, 15, 16, -1, -1, -1], "threshold": [5.550000190734863, 0.800000011920929, -2.0, 1.600000023841858, -2.0, -2.0, 1.5499999523162842, 0.75, -2.0, 5.0, -2.0, -2.0, 4.650000095367432, -2.0, 1.7000000476837158, 5.449999809265137, -2.0, -2.0, -2.0], "node_count": 19}, {"children_right": [8, 7, 4, -1, 6, -1, -1, -1, 20, 19, 12, -1, 18, 15, -1, 17, -1, -1, -1, -1, 22, -1, -1], "feature": [0, 1, 1, -2, 0, -2, -2, -2, 0, 3, 3, -2, 1, 3, -2, 2, -2, -2, -2, -2, 2, -2, -2], "value": [[[44.0, 59.0, 47.0]], [[41.0, 8.0, 3.0]], [[0.0, 8.0, 3.0]], [[0.0, 5.0, 0.0]], [[0.0, 3.0, 3.0]], [[0.0, 0.0, 3.0]], [[0.0, 3.0, 0.0]], [[41.0, 0.0, 0.0]], [[3.0, 51.0, 44.0]], [[3.0, 41.0, 9.0]], [[3.0, 41.0, 1.0]], [[3.0, 0.0, 0.0]], [[0.0, 41.0, 1.0]], [[0.0, 4.0, 1.0]], [[0.0, 1.0, 0.0]], [[0.0, 3.0, 1.0]], [[0.0, 3.0, 0.0]], [[0.0, 0.0, 1.0]], [[0.0, 37.0, 0.0]], [[0.0, 0.0, 8.0]], [[0.0, 10.0, 35.0]], [[0.0, 10.0, 0.0]], [[0.0, 0.0, 35.0]]], "children_left": [1, 2, 3, -1, 5, -1, -1, -1, 9, 10, 11, -1, 13, 14, -1, 16, -1, -1, -1, -1, 21, -1, -1], "threshold": [5.449999809265137, 2.8000001907348633, 2.450000047683716, -2.0, 5.0, -2.0, -2.0, -2.0, 6.25, 1.7000000476837158, 0.6000000238418579, -2.0, 2.25, 1.25, -2.0, 4.75, -2.0, -2.0, -2.0, -2.0, 4.949999809265137, -2.0, -2.0], "node_count": 23}, {"children_right": [2, -1, 12, 9, 6, -1, 8, -1, -1, 11, -1, -1, -1], "feature": [3, -2, 3, 2, 2, -2, 3, -2, -2, 0, -2, -2, -2], "value": [[[50.0, 61.0, 39.0]], [[50.0, 0.0, 0.0]], [[0.0, 61.0, 39.0]], [[0.0, 61.0, 6.0]], [[0.0, 59.0, 1.0]], [[0.0, 56.0, 0.0]], [[0.0, 3.0, 1.0]], [[0.0, 0.0, 1.0]], [[0.0, 3.0, 0.0]], [[0.0, 2.0, 5.0]], [[0.0, 2.0, 0.0]], [[0.0, 0.0, 5.0]], [[0.0, 0.0, 33.0]]], "children_left": [1, -1, 3, 4, 5, -1, 7, -1, -1, 10, -1, -1, -1], "threshold": [0.699999988079071, -2.0, 1.75, 5.050000190734863, 4.949999809265137, -2.0, 1.600000023841858, -2.0, -2.0, 6.050000190734863, -2.0, -2.0, -2.0], "node_count": 13}, {"children_right": [2, -1, 16, 7, 6, -1, -1, 9, -1, 11, -1, 13, -1, 15, -1, -1, -1], "feature": [3, -2, 2, 0, 3, -2, -2, 2, -2, 1, -2, 0, -2, 3, -2, -2, -2], "value": [[[49.0, 53.0, 48.0]], [[49.0, 0.0, 0.0]], [[0.0, 53.0, 48.0]], [[0.0, 53.0, 4.0]], [[0.0, 1.0, 1.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 1.0]], [[0.0, 52.0, 3.0]], [[0.0, 49.0, 0.0]], [[0.0, 3.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 2.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 1.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 3.0]], [[0.0, 0.0, 44.0]]], "children_left": [1, -1, 3, 4, 5, -1, -1, 8, -1, 10, -1, 12, -1, 14, -1, -1, -1], "threshold": [0.800000011920929, -2.0, 4.949999809265137, 4.949999809265137, 1.350000023841858, -2.0, -2.0, 4.75, -2.0, 2.5999999046325684, -2.0, 6.050000190734863, -2.0, 1.5999999046325684, -2.0, -2.0, -2.0], "node_count": 17}, {"children_right": [2, -1, 6, 5, -1, -1, 14, 13, 12, 11, -1, -1, -1, -1, -1], "feature": [3, -2, 2, 0, -2, -2, 2, 0, 3, 3, -2, -2, -2, -2, -2], "value": [[[46.0, 43.0, 61.0]], [[46.0, 0.0, 0.0]], [[0.0, 43.0, 61.0]], [[0.0, 39.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 39.0, 0.0]], [[0.0, 4.0, 59.0]], [[0.0, 4.0, 21.0]], [[0.0, 1.0, 21.0]], [[0.0, 1.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 19.0]], [[0.0, 3.0, 0.0]], [[0.0, 0.0, 38.0]]], "children_left": [1, -1, 3, 4, -1, -1, 7, 8, 9, 10, -1, -1, -1, -1, -1], "threshold": [0.699999988079071, -2.0, 4.75, 4.949999809265137, -2.0, -2.0, 5.149999618530273, 6.599999904632568, 1.7000000476837158, 1.5499999523162842, -2.0, -2.0, -2.0, -2.0, -2.0], "node_count": 15}, {"children_right": [2, -1, 4, -1, 16, 15, 14, 9, -1, 13, 12, -1, -1, -1, -1, -1, -1], "feature": [2, -2, 2, -2, 2, 3, 0, 2, -2, 0, 3, -2, -2, -2, -2, -2, -2], "value": [[[58.0, 41.0, 51.0]], [[58.0, 0.0, 0.0]], [[0.0, 41.0, 51.0]], [[0.0, 37.0, 0.0]], [[0.0, 4.0, 51.0]], [[0.0, 4.0, 17.0]], [[0.0, 4.0, 4.0]], [[0.0, 2.0, 4.0]], [[0.0, 1.0, 0.0]], [[0.0, 1.0, 4.0]], [[0.0, 1.0, 2.0]], [[0.0, 0.0, 2.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 2.0]], [[0.0, 2.0, 0.0]], [[0.0, 0.0, 13.0]], [[0.0, 0.0, 34.0]]], "children_left": [1, -1, 3, -1, 5, 6, 7, 8, -1, 10, 11, -1, -1, -1, -1, -1, -1], "threshold": [2.5999999046325684, -2.0, 4.75, -2.0, 5.149999618530273, 1.75, 6.5, 4.949999809265137, -2.0, 6.150000095367432, 1.5499999523162842, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0], "node_count": 17}, {"children_right": [2, -1, 14, 9, 8, 7, -1, -1, -1, 11, -1, 13, -1, -1, 18, 17, -1, -1, -1], "feature": [3, -2, 0, 2, 0, 1, -2, -2, -2, 3, -2, 3, -2, -2, 3, 2, -2, -2, -2], "value": [[[42.0, 54.0, 54.0]], [[42.0, 0.0, 0.0]], [[0.0, 54.0, 54.0]], [[0.0, 39.0, 11.0]], [[0.0, 37.0, 3.0]], [[0.0, 1.0, 3.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 3.0]], [[0.0, 36.0, 0.0]], [[0.0, 2.0, 8.0]], [[0.0, 0.0, 4.0]], [[0.0, 2.0, 4.0]], [[0.0, 2.0, 0.0]], [[0.0, 0.0, 4.0]], [[0.0, 15.0, 43.0]], [[0.0, 15.0, 4.0]], [[0.0, 15.0, 0.0]], [[0.0, 0.0, 4.0]], [[0.0, 0.0, 39.0]]], "children_left": [1, -1, 3, 4, 5, 6, -1, -1, -1, 10, -1, 12, -1, -1, 15, 16, -1, -1, -1], "threshold": [0.699999988079071, -2.0, 6.25, 4.800000190734863, 4.949999809265137, 2.450000047683716, -2.0, -2.0, -2.0, 1.5499999523162842, -2.0, 1.7000000476837158, -2.0, -2.0, 1.75, 5.050000190734863, -2.0, -2.0, -2.0], "node_count": 19}, {"children_right": [2, -1, 8, 5, -1, 7, -1, -1, 10, -1, 14, 13, -1, -1, -1], "feature": [2, -2, 2, 0, -2, 3, -2, -2, 0, -2, 0, 3, -2, -2, -2], "value": [[[55.0, 40.0, 55.0]], [[55.0, 0.0, 0.0]], [[0.0, 40.0, 55.0]], [[0.0, 39.0, 4.0]], [[0.0, 23.0, 0.0]], [[0.0, 16.0, 4.0]], [[0.0, 16.0, 0.0]], [[0.0, 0.0, 4.0]], [[0.0, 1.0, 51.0]], [[0.0, 0.0, 33.0]], [[0.0, 1.0, 18.0]], [[0.0, 1.0, 4.0]], [[0.0, 1.0, 0.0]], [[0.0, 0.0, 4.0]], [[0.0, 0.0, 14.0]]], "children_left": [1, -1, 3, 4, -1, 6, -1, -1, 9, -1, 11, 12, -1, -1, -1], "threshold": [2.5999999046325684, -2.0, 4.949999809265137, 5.949999809265137, -2.0, 1.649999976158142, -2.0, -2.0, 6.599999904632568, -2.0, 6.75, 2.0, -2.0, -2.0, -2.0], "node_count": 15}]}';
        var rfModel;

        it('RFModel should work', function() {
            rfModel = new skRFPredictor.__testOnly__.RFModel(irisRFStr);
            for (i = 0; i < rfModel.estimators_.length; i++) {
                expect(rfModel.estimators_[i].isValidTree()).to.be.true;
            }
        });

        it('RFModel.getNumTrees should work', function() {
            expect(rfModel.getNumTrees()).to.equal(10);
        });

        it('RFModel.parseModel should work', function() {
            // This is currently already implicitly tested in previous test
            rfModel.parseModel(irisRFStr);
        });

        it('RFModel.predict_proba should work', function() {
            var probs = rfModel.predict_proba([3,3,3,3]);
            expect(probs[0]).to.equal(0.1);
            expect(probs[1]).to.equal(0.2);
            expect(probs[2]).to.equal(0.7);
        });

        it('RFModel.predict should work', function() {
            var pred = rfModel.predict([3,3,3,3]);
            expect(pred.classIdx).to.equal(2);
            expect(pred.score).to.equal(0.7);
        });
    });


    describe("Model Meta", function() {
        it("Model Meta should initialize", function() {
            // TODO: MetaModel
        });

        it("ModelMeta.parseModel should work", function() {
            // TODO: MetaModel.parseModel
        });

        it("ModelMeta.processInputData should work", function() {
            // TODO: MetaModel.processInputData
        });

        it("ModelMeta predictions should work", function() {
            // TODO: ModelMeta.predict_proba
            //       ModelMeta.predict
        });
    });

    describe("Public functions should work", function() {
        it("Setup should work", function() {
            // TODO: skRFPredictor.setup
        });
        it("Predict should work", function() {
            // TODO: skRFPredictor.predict
        });
    });
});
