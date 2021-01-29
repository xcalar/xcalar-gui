module.exports = require('./tutorialProjectBaseTest.js').replay(
    {
        workbook: 'WordCount',
        validation: [
            {
                dfName: 'Dataflow 1',
                resultNodeName: 'Node 2',
                resultType: 'single value',
                resultValue: '{"Value": 30}',
                expectedNodes: [
                    'dataset',
                    'singleValue',
                ],
                // expectedComments: [
                //     'Word Count Application\n\nThis dataflow shows how to count the number of words in a text file  by importing the file such that each word is imported in a separate row and then counting the number of rows.',
                //     'Step1: Import word_count.txt using a space character for the Record Delimiter and no Field Delimiter.\n\nXcalar displays the preview of the import as you play with the import settings.',
                //     'Step 2: Add a Dataset Node to the dataflow and configure it to read the dataset created in step 1. ',
                //     'Step 3: Add a Single Value Node to the dataflow and configure it to count the number of rows in the dataset. Execute the Node and View Result.',
                // ]
            },
            {
                dfName: 'Dataflow 2',
                resultNodeName: 'Node 2',
                resultType: 'table value',
                resultValue: {
                    column: 'count',
                    value: '30',
                },
                expectedNodes: [
                    'dataset',
                    'map',
                ],
                // expectedComments: [
                //     'Word Count Application\n\nThis dataflow shows how to count the number of words in a text file  by importing the file such that all text is imported into one row and then using Python to count the number of words.',
                //     'Step1: Import word_count.txt with no Record Delimiter and no Field Delimiter.\n\nXcalar displays the preview of the import as you play with the import settings.',
                //     'Step 2: Add a Dataset Node to the dataflow and configure it to read the dataset created in step 1. ',
                //     'Step 3: Create a user-defined function (UDF) split_words to count the number of words in the input and save it in a module named wordcountudf.py.',
                //     'Step 4: Add a Map Node to the dataflow and configure it to use the UDF created in step 3. Execute and View Result.',
                // ]
            },
            {
                dfName: 'Dataflow 3',
                resultNodeName: 'Node 3',
                resultType: 'single value',
                resultValue: '{"Value": 30}',
                expectedNodes: [
                    'dataset',
                    'explode',
                    'singleValue',
                ],
                // expectedComments: [
                //     'Word Count Application\n\nThis dataflow shows how to count the number of words in a text file  by importing the file such that all text is imported into one row and then exploding the cell value and using aggregates.',
                //     'Step1: Duplicate Dataflow 2 and remove the Map Node.',
                //     'Step 2: Add an Explode Node to split the cell values in separate words.',
                //     'Step 4: Add a Single Value Node and configure it to count the number of rows created in step 2. Execute and View Result.',
                // ]
            }
        ]
    },
    ["tutorial project word count test", "allTestsDisabled"]
);