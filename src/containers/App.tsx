import * as React from "react";
import DeleteTableModal from "../components/modals/DeleteTableModal";
import DeletePbTableModal from  "../components/modals/DeletePbTableModal";
import DeleteSQLModal from "../components/modals/DeleteSQLModal";
import DeleteModuleModal from "../components/modals/DeleteModuleModal";
import DeleteTableFuncModal from "../components/modals/DeleteTableFuncModal";
import SQLEditorShortcutsModal from "../components/modals/SQLEditorShortcutsModal";
import RecreatePbTablesModal from "../components/modals/RecreatePbTablesModal";
import CustomNodeManagerModal from "../components/modals/CustomNodeManagerModal";

const App = () => (
    <div>
        <DeleteTableModal/>
        <DeletePbTableModal/>
        <DeleteSQLModal/>
        <DeleteModuleModal />
        <DeleteTableFuncModal />
        <SQLEditorShortcutsModal/>
        <RecreatePbTablesModal />
        <CustomNodeManagerModal />
    </div>
);

export default App;