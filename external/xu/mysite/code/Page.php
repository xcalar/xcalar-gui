<?php
class Page extends SiteTree {

    private static $db = array(
    );

    private static $has_one = array(
    );
}
class Page_Controller extends ContentController {

    /**
     * An array of actions that can be accessed via a request. Each array element should be an action name, and the
     * permissions or conditions required to allow the user to access it.
     *
     * <code>
     * array (
     *     'action', // anyone can access this action
     *     'action' => true, // same as above
     *     'action' => 'ADMIN', // you must have ADMIN permissions to access this action
     *     'action' => '->checkAction' // you can only access this action if $this->checkAction() returns true
     * );
     * </code>
     *
     * @var array
     */
    private static $allowed_actions = array (
        // 'getCurrentUser'
        // 'isPaid',
        'displayLink',
        'shouldShowCorrectness',
        'shouldShowExercise',
        'fetchRegionById',
        'getUserStage',
        'setUserStage',
        'getUserAnswerRecord',
        'getUserAnswer',
        'setUserAnswer',
        'setCorrectResponse',
        'setInCorrectResponse',
        'isAnswerCorrect',
        'saveLastSubmit',
        'checkPageSwitch',
        'nextQuestion'
    );

    public function init() {
        parent::init();
    }

    public function displayLink($link) {
        $shouldShowExercise = $this->shouldShowExercise();
        if ($shouldShowExercise) {
            return True;
        } else if (strrpos($link, "exercise") == False) {
            return True;
        } else {
            return False;
        }
    }

    public function getUserRecord($userID) {
        $user = LoginSubmission::get()->byID($userID);
        return $user;
    }

    public function getEventCodeRecord($eventCode) {
        $eventCodeRecords = RegionEventCode::get()->filter(array(
            'EventCode' => $eventCode
        ));
        if (count($eventCodeRecords) == 0) {
            return NULL;
        } else {
            $eventCodeRecord = $eventCodeRecords[0];
            return $eventCodeRecord;
        }
    }

    public function shouldShowCorrectness() {
        $userID = $_SESSION["currentUserID"];
        $user = $this->getUserRecord($userID);
        if (is_null($user)) {
            return false;
        } else {
            $eventCode = $user->EventCode;
            $eventCodeRecord = $this->getEventCodeRecord($eventCode);
        }
        if (is_null($eventCodeRecord)) {
            return false;
        } else {
            return $eventCodeRecord->ShowCorrectness;
        }
    }

    public function shouldShowExercise() {
        $userID = $_SESSION["currentUserID"];
        $user = $this->getUserRecord($userID);
        if (is_null($user)) {
            return false;
        } else {
            $eventCode = $user->EventCode;
            $eventCodeRecord = $this->getEventCodeRecord($eventCode);
        }
        if (is_null($eventCodeRecord)) {
            return false;
        } else {
            return $eventCodeRecord->ShowExercise;
        }
    }

    public function getCurrentUserName() {
        $userID = $_SESSION["currentUserID"];
        $user = $this->getUserRecord($userID);
        if (is_null($user)) {
            return "";
        } else {
            return $user->Name;
        }
    }

    public function getCurrentUserEmail() {
        $userID = $_SESSION["currentUserID"];
        $user = $this->getUserRecord($userID);
        if (is_null($user)) {
            return "";
        } else {
            return $user->Email;
        }
    }

   /*
    *  Update user stage in table LoginSubmission
    *  user stage has the format like:
    *  Stage_for_adventure_1, Stage_for_exercise_2
    */
    public function getUserStage($userID) {
        $user = $this->getUserRecord($userID);
        $key = 'Stage_for_'.($this->getTrainingType()).'_'.($this->getTrainingID());
        if (is_null($user)) {
            return 0;
        } else {
            return $user->$key;
        }
    }

    public function setUserStage($userID, $stage) {
        $user = $this->getUserRecord($userID);
        $key = 'Stage_for_'.($this->getTrainingType()).'_'.($this->getTrainingID());
        if (!is_null($user)) {
            $user->$key = $stage;
            $user->write();
            if (($user->$key) == ($this->QuestionNum)) {
                $this->setTotalTimeTaken($userID);
            } else if (($user->$key) == (($this->QuestionNum) - 1)) {
                // for exercise not showing correctness, the user can reselect answer many times
                // if user stage drop from full to (full - 1), then the use does not finished all questions
                // should clear total time taken
                $this->clearTotalTimeTaken($userID);
            }
        }
    }

    /*
     *  Update user answer in table UserAnswer
     */
    public function getUserAnswerRecord($userID, $questionID) {
        $trainingType = $this->getTrainingType();
        $trainingID = $this->getTrainingID();

        $userAnswers = UserAnswer::get()->filter(array(
            'UserID' => $userID,
            'TrainingType' => $trainingType,
            'TrainingID' => $trainingID,
            'QuestionID' => $questionID
        ));

        if (count($userAnswers) == 0) {
            $userAnswer = UserAnswer::create();
            $userAnswer->UserID = $userID;
            $userAnswer->TrainingID = $trainingID;
            $userAnswer->TrainingType = $trainingType;
            $userAnswer->QuestionID = $questionID;
            $userAnswer->write();
            return $userAnswer;
        } else {
            return $userAnswers[0];
        }
    }

    public function getUserAnswer($userID, $questionID) {
        $userAnswer = $this->getUserAnswerRecord($userID, $questionID);
        $userAnswer->Answer;
    }

    public function setUserAnswer($userID, $questionID, $userAnswer, $isCorrect) {
        $user = $this->getUserAnswerRecord($userID, $questionID);
        $user->Answer = $userAnswer;
        $user->IsCorrect = $isCorrect;
        $user->write();
    }

   /*
    *  Update total time Taken in table TimeTaken
    */
    public function setTotalTimeTaken($userID) {
        $timeTakenRecord = $this->getTimeTakenRecord($userID);
        $questionNum = $this->getQuestionNumber();
        $totalTimeTaken = 0;
        for ($i = 1; $i <= $questionNum; $i++) {
            $correctRecords = CorrectResponses::get()->filter(array(
                'UserID' => $userID,
                'TrainingID' => $this->getTrainingID(),
                'TrainingType' => $this->getTrainingType(),
                'QuestionID' => $i
            ));
            if (count($correctRecords) > 0) {
                $correctRecord = $correctRecords[0];
                $totalTimeTaken += ($correctRecord->TimeTaken);
            }
        }
        // Total Time taken equals to the sum of time taken for each question
        $timeTakenRecord->TimeTaken = $totalTimeTaken;
        $timeTakenRecord->write();
    }

    public function clearTotalTimeTaken($userID) {
        $timeTakenRecord = $this->getTimeTakenRecord($userID);
        $questionNum = $this->getQuestionNumber();
        $timeTakenRecord->TimeTaken = 0;
        $timeTakenRecord->write();
    }

    public function getTimeTakenRecord($userID) {
        $trainingType = $this->getTrainingType();
        $trainingID = $this->getTrainingID();
        $timeTakens = TimeTaken::get()->filter(array(
            'UserID' => $userID,
            'TrainingID' => $trainingID,
            'TrainingType' => $trainingType
        ));
        if (count($timeTakens) == 0) {
            $timeTaken = TimeTaken::create();
            $timeTaken->UserID = $userID;
            $timeTaken->TrainingID = $trainingID;
            $timeTaken->TrainingType = $trainingType;
            $timeTaken->write();
        } else {
            $timeTaken = $timeTakens[0];
        }
        return $timeTaken;
    }

    public function getEnterPageTime($userID) {
        $timeTakenRecord = $this->getTimeTakenRecord($userID);
        return $timeTakenRecord->EnterTime;
    }

    public function setEnterPageTime($userID, $time) {
        $timeTakenRecord = $this->getTimeTakenRecord($userID);
        $timeTakenRecord->EnterTime = $time;
        $timeTakenRecord->write();
    }

    public function getLastSuccessfulSubmittedTime($userID) {
        $timeTakenRecord = $this->getTimeTakenRecord($userID);
        return $timeTakenRecord->LastSuccessSubmittedTime;
    }

    public function setLastSuccessfulSubmittedTime($userID, $time) {
        $timeTakenRecord = $this->getTimeTakenRecord($userID);
        $timeTakenRecord->LastSuccessSubmittedTime = $time;
        $timeTakenRecord->write();
    }

    public function getLastSubmittedTime($userID) {
        $timeTakenRecord = $this->getTimeTakenRecord($userID);
        return $timeTakenRecord->LastSubmittedTime;
    }

    public function setLastSubmittedTime($userID, $time) {
        $timeTakenRecord = $this->getTimeTakenRecord($userID);
        $timeTakenRecord->LastSubmittedTime = $time;
        $timeTakenRecord->write();
    }

    // reset the stayTime during if the user swift to a new page
    public function checkEnterPageTime() {
        $expectedPage = ($this->getTrainingType()).'_'.($this->getTrainingID());
        // Enter current page from login or from other pages
        if ((!isset($_SESSION["currPage"])) || ($_SESSION["currPage"] != $expectedPage)) {
            $_SESSION["currPage"] = $expectedPage;
            date_default_timezone_set('America/Los_Angeles');
            $enterTime = date("Y-m-d H:i:s", time());
            $userID = $_SESSION["currentUserID"];
            $this->setEnterPageTime($userID, $enterTime);
        }
    }

    /*
     *  Update Correct Response
     */
    public function setCorrectResponse($userID, $questionID, $userAnswer, $submitTime) {
        // Time taken equals to the span between two correct responses
        $lastSubmitTime = $this->getLastSuccessfulSubmittedTime($userID);
        if (is_null($lastSubmitTime)) {
            $lastSubmitTime = $this->getEnterPageTime($userID);
        }
        $correctRecord = CorrectResponses::create();
        $correctRecord->UserID = $userID;
        $correctRecord->TrainingType = $this->getTrainingType();
        $correctRecord->TrainingID = $this->getTrainingID();
        $correctRecord->QuestionID = $questionID;
        $correctRecord->TimeTaken = (strtotime($submitTime) - strtotime($lastSubmitTime)) / 60;
        $correctRecord->TimeSubmitted = $submitTime;
        $correctRecord->Answer = $userAnswer;
        $correctRecord->write();
        $this->setLastSubmittedTime($userID, $submitTime);
        $this->setLastSuccessfulSubmittedTime($userID, $submitTime);
    }

    /*
     *  Update InCorrect Response
     */
    public function setInCorrectResponse($userID, $questionID, $userAnswer, $submitTime) {
        // Time taken equals to the span between two neighboring responses
        $lastSubmitTime = $this->getLastSubmittedTime($userID);
        if (is_null($lastSubmitTime)) {
            $lastSubmitTime = $this->getEnterPageTime($userID);
        }
        $incorrectRecord = InCorrectResponses::create();
        $incorrectRecord->UserID = $userID;
        $incorrectRecord->TrainingType = $this->getTrainingType();
        $incorrectRecord->TrainingID = $this->getTrainingID();
        $incorrectRecord->QuestionID = $questionId;
        $incorrectRecord->TimeTaken = (strtotime($submitTime) - strtotime($lastSubmitTime)) / 60;
        $incorrectRecord->TimeSubmitted = $submitTime;
        $incorrectRecord->Answer = $userAnswer;
        $incorrectRecord->write();
        $this->setLastSubmittedTime($userID, $submitTime);
        $this->increaseErrorAttempt($userID);
    }

    public function increaseErrorAttempt($userID) {
        $user = $this->getUserRecord($userID);
        $key = 'ErrorAttempt_for_'.($this->getTrainingType()).'_'.($this->getTrainingID());
        if (!is_null($user)) {
            $user->$key = ($user->$key) + 1;
            $user->write();
        }
    }
}
