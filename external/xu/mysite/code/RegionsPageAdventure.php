<?php

class RegionsPageAdventure extends Page {

    private static $has_many = array(
        'Regions' => 'RegionAdventure',
    );
    private static $db = array(
        'AdventureID'=> 'Int',   // Must be the ID of the current task
        'QuestionNum' => 'Int' // The total question number of the current Task
    );

    function getCMSFields() {
        $fields = parent::getCMSFields();
        $fields->addFieldToTab('Root.Regions', GridField::create(
            'Regions',
            'Regions on this page',
            $this->Regions(),
            GridFieldConfig_RecordEditor::create()
        ));
        $fields->addFieldToTab("Root.Main", new TextField('AdventureID','Adventure ID'));
        $fields->addFieldToTab("Root.Main", new TextField('QuestionNum', 'Question Number'));
        return $fields;
    }
}

class RegionsPageAdventure_Controller extends Page_Controller {
    private static $allowed_actions = array();

    public function fetchRegionById($questionId) {
        $regs = RegionAdventure::get()->filter(array(
            'RegionsPageAdventureID' => ($this->ID),
            'QuestionID' => $questionId
        ));
        return $regs[0];
    }

    public function getTrainingType() {
        return "adventure";
    }

    public function getTrainingID() {
        return ($this->AdventureID);
    }

    public function getQuestionNumber() {
        return ($this->QuestionNum);
    }

    public function isAnswerCorrect($questionId, $submitAnswer) {
        $userAnswer = trim(strtolower($submitAnswer));
        $isCorrect = false;
        $region = $this->fetchRegionById($questionId);
        // For question with no correct answer, user must input something, empty input is not allowed
        // For question with correct answer, you
        if (($region->CanSkip) && ($userAnswer == "")) {
            return true;
        } else if ($region->HasNoCorrectAnswer) {
            if ((!$region->CanSkip) && ($userAnswer == "")) {
                return false;
            } else {
                return true;
            }
        } else {
            $correctAnswers = explode(",", strtolower($region->Answer));
            $correctAnswerNum = count($correctAnswers);
            for ($i = 0; $i < $correctAnswerNum; $i++) {
                if ($userAnswer == $correctAnswers[$i]) {
                    $isCorrect = true;
                    break;
                }
            }
            return $isCorrect;
        }
    }

    public function saveLastSubmit() {
        $submitQuestionID = $_POST["questionNumber"];
        $submitAnswer = $_POST["answerInput"];
        $userID = $_SESSION["currentUserID"];
        date_default_timezone_set('America/Los_Angeles');
        $submitTime = date("Y-m-d H:i:s", time());

        $isCorrect = $this->isAnswerCorrect($submitQuestionID, $submitAnswer);
        $this->setUserAnswer($userID, $submitQuestionID, $submitAnswer, $isCorrect, $submitTime);
        if ($isCorrect) {
            $this->setCorrectResponse($userID, $submitQuestionID, $submitAnswer, $submitTime);
            $this->setUserStage($userID, $submitQuestionID);
        } else {
            $this->setInCorrectResponse($userID, $submitQuestionID, $submitAnswer, $submitTime);
        }
    }

    public function nextQuestion() {
        if (!isset($_SESSION["currentUserID"])) {
            $this->redirect("/xu/home/");
        }
        $this->checkEnterPageTime();

        // Read previous answer from Session
        if (isset($_POST["answerInput"])) {
            $this->saveLastSubmit();
        }

        $userID = $_SESSION["currentUserID"];
        $adventureID = $this->AdventureID;
        $totalQuestionNum = $this->QuestionNum;
        // how many question have been finished by the user
        $userStage = $this->getUserStage($userID);
        // how many question should be displayed
        $displayQuestionNum = ($userStage == $totalQuestionNum) ? ($userStage) : ($userStage + 1);

        $res = $res .'<div id="'. $adventureID .'" class="adventure" data-totalquestion='.$totalQuestionNum.'>';
        for ($i = 1; $i <= $displayQuestionNum; $i++) {
            $reg = $this->fetchRegionById($i);
            $description = $reg->Description;
            $question = $reg->Question;
            $canSkip = $reg->CanSkip;
            $isTextArea = $reg->IsTextArea;

            $userAnswerRecord = $this->getUserAnswerRecord($userID, $i);
            $disabled = "";
            $btnDisabled = "";
            $btnQuestion = "";
            $isCorrect = "default";
            $skipable = "";
            $userAnswer = "";
            $buttonInfo = "SUBMIT";
            // display user submitted answers
            if ($userAnswerRecord->IsCorrect) {
                // user answer is correct
                $disabled = "disabled";
                $btnDisabled = "btn-disabled";
                $isCorrect = "correct";
            }
            if (!is_null($userAnswerRecord->Answer)) {
                $userAnswer = $userAnswerRecord->Answer;
                if (!$userAnswerRecord->IsCorrect) {
                    // user answer is not correct
                    $isCorrect = "incorrect";
                }
            }
            if ($canSkip) {
                $skipable = "skipable";
            }
            if ($canSkip && is_null($userAnswerRecord->Answer)) {
                $buttonInfo = "SKIP";
            }
            // mark the button unanswered question
            if ($i > $userStage) {
                $btnQuestion = "btnQuestion";
            }
            if ($isTextArea) {
                $res = $res.
                '<div class="region">'.
                    '<div class="description '. $btnQuestion. '" type="text">'.nl2br($description).'</div>'.
                    '<div class="question '. $btnQuestion.'" type="text">'.nl2br($question).'</div>'.
                    '<form class="textareaForm" action="'.$host.'" method="post" id="formID">'.
                        '<div class="textareaContainer">'.
                            '<textarea class="textarea-lastQuestion '. $isCorrect .' '. $skipable.'" name="answerInput"' .$disabled.'>'.
                                $userAnswer .
                            '</textarea>'.
                            '<input type="hidden" name="questionNumber" value="'. $displayQuestionNum .'">'.
                            '<button class="btn-textarea '. $isCorrect . ' btn '. $btnDisabled.' " >'.
                                $buttonInfo.
                            '</button>'.
                        '</div>'.
                    '</form>'.
                '</div>';
            } else {
                $res = $res.
                    '<div class="region">'.
                        '<div class="description" type="text">'.nl2br($description).'</div>'.
                        '<div class="question" type="text">'.nl2br($question).'</div>'.
                        '<form action="'. $host . '" method="post">'.
                            '<div class="entireInput '. $isCorrect.'">'.
                                '<input class="userInput '.$skipable.'" type="text" name="answerInput" value="'.$userAnswer.'" '.$disabled.' autocomplete="off">'.
                                '<div class="userIcon">'.
                                    '<i class="icon xi-error"></i>'.
                                    '<i class="icon xi-success"></i>'.
                                '</div>'.
                                '<input type="hidden" name="questionNumber" value="'. $displayQuestionNum .'">'.
                            '</div>'.
                            '<button class="'. $isCorrect . ' btn '. $btnDisabled.' " >'.
                                $buttonInfo.
                            '</button> <br>'.
                        '</form>'.
                    '</div>';
            }
        }
        $res = $res.'</div>';
        if ($userStage == $totalQuestionNum) {
            $res = $res . '<p>You have completed the adventure Successfully! </p>';
        };
        return $res;
    }
}
