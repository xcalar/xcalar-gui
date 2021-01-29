<?php

class RegionsPageExercise extends Page {

    private static $has_many = array(
        'Regions' => 'RegionExercise',
    );
    private static $db = array(
        'ExerciseID'=> 'Int',   // Must be the ID of the current task
        'QuestionNum' => 'Int', // The total question number of the current Task
    );

    function getCMSFields() {
        $fields = parent::getCMSFields();
        $fields->addFieldToTab('Root.Regions', GridField::create(
            'Regions',
            'Regions on this page',
            $this->Regions(),
            GridFieldConfig_RecordEditor::create()
        ));
        $fields->addFieldToTab("Root.Main", new TextField('ExerciseID','Exercise ID'));
        $fields->addFieldToTab("Root.Main", new TextField('QuestionNum', 'Question Number'));
        return $fields;
    }
}

class RegionsPageExercise_Controller extends Page_Controller {
    private static $allowed_actions = array(
        'saveLastSubmit'
    );

    public function fetchRegionById($questionId) {
        $regs = RegionExercise::get()->filter(array(
            'RegionsPageExerciseID' => ($this->ID),
            'QuestionID' => $questionId
        ));
        return $regs[0];
    }

    public function getTrainingType() {
        return "exercise";
    }

    public function getTrainingID() {
        return ($this->ExerciseID);
    }

    public function getQuestionNumber() {
        return ($this->QuestionNum);
    }

    // Judge whether the answer is correct
    public function isAnswerCorrect($questionId, $userAnswer) {
        $isCorrect = false;
        $region = $this->fetchRegionById($questionId);
        if (($region->Answer."") == ($userAnswer."")) {
            $isCorrect = true;
        }
        return $isCorrect;
    }

    public function saveLastSubmit() {
        $submitQuestionID = $_POST['questionID'];
        $submitAnswer = $_POST['optionID'];
        $userID = $_SESSION["currentUserID"];
        date_default_timezone_set('America/Los_Angeles');
        $submitTime = date("Y-m-d H:i:s", time());

        $isCorrect = $this->isAnswerCorrect($submitQuestionID, $submitAnswer);
        if ($isCorrect) {
            $stage = $this->getUserStage($userID);
            $userAnswerRecord = $this->getUserAnswerRecord($userID, $submitQuestionID);
            // In exercise user do not need to answer each question in order, therefore $stage
            // is not the question ID, but previous $stage + 1
            if (!$userAnswerRecord->IsCorrect) {
                $this->setUserStage($userID, $stage + 1, $submitTime);
            }
            $this->setCorrectResponse($userID, $submitQuestionID, $submitAnswer, $submitTime);
        } else {
            $stage = $this->getUserStage($userID);
            $userAnswerRecord = $this->getUserAnswerRecord($userID, $submitQuestionID);
            // For Not show correctness mode, the user is able to change selected option for the same question
            if ($userAnswerRecord->IsCorrect) {
                $this->setUserStage($userID, $stage - 1, $submitTime);
            }
            $this->setInCorrectResponse($userID, $submitQuestionID, $submitAnswer, $submitTime);
        }
        $this->setUserAnswer($userID, $submitQuestionID, $submitAnswer, $isCorrect, $submitTime);
        return $isCorrect;
    }

    public function nextQuestion() {
        if ((!isset($_SESSION["currentUserID"])) || (!$this->shouldShowExercise())) {
            $this->redirect("/xu/home/");
        }
        $this->checkEnterPageTime();
        $userID = $_SESSION["currentUserID"];
        $exerciseID = $this->ExerciseID;
        $totalQuestionNum = $this->QuestionNum;
        // $isOnline = $this->isOnline();
        $shouldShowCorrectness = $this->shouldShowCorrectness();
        // $online = $isOnline ? "online" : "";
        $correctness = $shouldShowCorrectness ? "showCorrectness": "";

        $res = "";
        // $res = $res.'<div id="'.$exerciseID.'" class="exercise '.$online.'">';
        $res = $res.'<div id="'.$exerciseID.'" class="exercise '.$correctness.'">';
        for ($i = 1; $i <= $totalQuestionNum; $i++) {
            $reg = $this->fetchRegionById($i);
            $description = $reg->Description;
            $question = $reg->Question;
            $optionNum = $reg->OptionNumber;
            $isImage = $reg->IsImage;
            $Option1 = $reg->Option1;
            $Option2 = $reg->Option2;
            $Option3 = $reg->Option3;
            $Option4 = $reg->Option4;
            $Answer = $reg->Answer;

            $userAnswerRecord = $this->getUserAnswerRecord($userID, $i);
            $disabled = "";
            if ($shouldShowCorrectness && $userAnswerRecord->IsCorrect) {
                $disabled = "disabled";
            }
            $withImage = "";
            if ($reg->IsImage == 1) {
                $withImage = "screenshot";
            } else if ($reg->IsImage == 2) {
                $withImage = "iconImage";
            }
            $res = $res.
            '<div class="region">'.
                '<div class="description" type="text">'.nl2br($description).'</div>'.
                '<div class="question" type="text">'.nl2br($question).'</div>'.
                '<form class="multipleChoiceForm">'.
                '<div class="questionNumber" style="display:none">'.$i.'</div>'.
                '<div class="radioButtonGroup '.$disabled.'">';
            for ($j = 1; $j <= $optionNum; $j++) {
                $option = 'Option'.$j;
                $choice = $reg->$option;
                if ($withImage != "" && $choice == "") {
                    $choice = "<div class='imageWrapper'>".
                                "<img src='themes/simple/images/exercises/".$exerciseID."/option".$i."_".$j.".png'>".
                              "</div>";
                }
                $isActive = "";
                $isCorrect = "";
                if (($userAnswerRecord->Answer."") == ($j."")) {
                    $isActive = 'active';
                    if ($shouldShowCorrectness) {
                        if ($userAnswerRecord->IsCorrect) {
                            $isCorrect = "correct";
                        } else {
                            $isCorrect = "incorrect";
                        }
                    }
                }
                $res = $res.
                        '<div class="radioButton '.$isActive.' '.$isCorrect.' '.$withImage.'">'.
                        '<div class="radio">'.
                            '<i class="icon xi-radio-selected"></i>'.
                            '<i class="icon xi-radio-empty"></i>'.
                        '</div>'.
                        '<div class="label">'.
                            $choice.
                        '</div>';
                if ($shouldShowCorrectness) {
                    $res = $res.
                            '<div class="userIcon">'.
                            '<i class="icon xi-error"></i>'.
                            '<i class="icon xi-success"></i>'.
                            '</div>';
                }
                $res = $res.'</div>';
            }
            $res = $res.
                   '</div>'.'</form>'.'</div>';
        }
        $res = $res.'</div>';
        if ($shouldShowCorrectness && ($this->getUserStage($userID, $exerciseID) == $totalQuestionNum)) {
            $res = $res.'<p>You have completed the adventure Successfully! </p>';
        };
        return $res;
    }
}
