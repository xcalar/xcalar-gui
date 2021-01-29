<?php

class RestfulServer extends Page {
}

class RestfulServer_Controller extends ContentController {

    private static $cors = array (
        'Enabled'       => true,
        'Allow-Origin'  => '*',
        'Allow-Headers' => '*',
        'Allow-Methods' => 'POST, GET, PUT, DELETE'
    );

    private static $allowed_actions = array (
        'submitExercise',
        'pullStage',
        'logout'
    );

    private static $url_handlers = array(
        'api/submitExercise' => 'submitExercise',
        'api/logout' => 'logout',
        'api/pullStage' => 'pullStage'
    );

    private static $shouldLogout = false;

    public function init() {
        parent::init();
    }

    function submitExercise() {
        $questionID = $_POST['questionID'];
        $exerciseID = $_POST['exerciseID'];
        $optionID = $_POST['optionID'];
        $userID = $_SESSION["currentUserID"];

        if (isset($questionID) &&
            isset($exerciseID) &&
            isset($optionID)
        ){
            $exercises = RegionsPageExercise::get()->filter(array(
                'ExerciseID' => $exerciseID,
            ));
            if (count($exercises) == 0) {
                return "fail";
            }
            $exercise = $exercises[0];
            $controller = RegionsPageExercise_Controller::create($exercise);
            if ($controller->saveLastSubmit()) {
                echo "success";
            } else {
                echo "fail";
            }
        }
    }

    function logout() {
        session_destroy();
        $_SESSION = [];
        echo "true";
    }

    function pullStage() {
        $trainingType = $_POST["trainingType"];
        $trainingID = $_POST["trainingID"];
        $eventCode = $_POST["EventCode"];

        if (isset($trainingType) &&
            isset($trainingID) &&
            isset($eventCode)
        ){
            $name = 'Name';
            $email = 'Email';
            $userNames = [];
            $emails = [];
            $stages = [];
            $errorAttempts = [];
            $questionNum = 0;
            $stage = "Stage_for_" . $trainingType . "_" . $trainingID;
            $errorAttempt = "ErrorAttempt_for_" . $trainingType . "_" . $trainingID;

            $userRecords = LoginSubmission::get()->filter(array(
                'EventCode' => $eventCode
            ));
            for ($i = 0; $i < count($userRecords); $i++) {
                $userRecord = $userRecords[$i];
                array_push($userNames, $userRecord->$name);
                array_push($emails, $userRecord->$email);
                array_push($stages, $userRecord->$stage);
                array_push($errorAttempts, $userRecord->$errorAttempt);
            }

            if ($trainingType == "adventure") {
                $trainings = RegionsPageAdventure::get()->filter(array(
                    'AdventureID' => $trainingID,
                ));
                if (count($trainings) == 0) {
                    $questionNum = 0;
                } else {
                    $training = $trainings[0];
                    $controller = RegionsPageAdventure_Controller::create($training);
                    $questionNum = $controller->getQuestionNumber();
                }
            } else {
                $trainings = RegionsPageExercise::get()->filter(array(
                    'ExerciseID' => $trainingID,
                ));
                if (count($trainings) == 0) {
                    $questionNum = 0;
                } else {
                    $training = $trainings[0];
                    $controller = RegionsPageExercise_Controller::create($training);
                    $questionNum = $controller->getQuestionNumber();
                }
            }
            echo "[",json_encode($userNames), ",", json_encode($emails), ",", json_encode($stages), ",", json_encode($errorAttempts), ",", json_encode($questionNum), "]";
        }
    }
}

