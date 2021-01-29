<?php
/*
 * Contain information of all users
 */
class LoginSubmission extends DataObject {
    /*
    * Monitering each user's behavior need to pull the data from the table periodically
    * single table with many columns save time by avoiding execution of join
    */
    private static $db = array(
        'Name' => 'Text',
        'Email' => 'Text',
        'isPaid' => 'Boolean(0)',
        'isOnline' => 'Boolean(0)',
        'EventCode' => 'Text',
        'Stage_for_adventure_1' => 'Int(0)',
        'Stage_for_adventure_2' => 'Int(0)',
        'Stage_for_exercise_1' => 'Int(0)',
        'Stage_for_exercise_2' => 'Int(0)',
        'Stage_for_exercise_3' => 'Int(0)',
        'Stage_for_exercise_4' => 'Int(0)',
        'Stage_for_exercise_5' => 'Int(0)',
        'Stage_for_exercise_6' => 'Int(0)',
        'Stage_for_exercise_7' => 'Int(0)',
        'Stage_for_exercise_8' => 'Int(0)',
        'Stage_for_exercise_9' => 'Int(0)',
        'Stage_for_exercise_10' => 'Int(0)',
        'Stage_for_exercise_11' => 'Int(0)',
        'Stage_for_exercise_12' => 'Int(0)',
        'Stage_for_exercise_13' => 'Int(0)',
        'Stage_for_exercise_14' => 'Int(0)',
        'ErrorAttempt_for_adventure_1' => 'Int(0)',
        'ErrorAttempt_for_adventure_2' => 'Int(0)',
        'ErrorAttempt_for_exercise_1' => 'Int(0)',
        'ErrorAttempt_for_exercise_2' => 'Int(0)',
        'ErrorAttempt_for_exercise_3' => 'Int(0)',
        'ErrorAttempt_for_exercise_4' => 'Int(0)',
        'ErrorAttempt_for_exercise_5' => 'Int(0)',
        'ErrorAttempt_for_exercise_6' => 'Int(0)',
        'ErrorAttempt_for_exercise_7' => 'Int(0)',
        'ErrorAttempt_for_exercise_8' => 'Int(0)',
        'ErrorAttempt_for_exercise_9' => 'Int(0)',
        'ErrorAttempt_for_exercise_10' => 'Int(0)',
        'ErrorAttempt_for_exercise_11' => 'Int(0)',
        'ErrorAttempt_for_exercise_12' => 'Int(0)',
        'ErrorAttempt_for_exercise_13' => 'Int(0)',
        'ErrorAttempt_for_exercise_14' => 'Int(0)',
    );
}

/*
 * time Taken for a user to finished the entire Exercise / Adventure
 */
class TimeTaken extends DataObject {
    private static $db = array(
        'UserID' => 'Int',
        'TrainingType' => 'Text(null)',
        'TrainingID' => 'Int',
        'EnterTime'  => 'Text(100)',         // Time to go to a Training Page
        'LastSubmittedTime' => 'Text(100)',  // Last Submitted Time
        'LastSuccessSubmittedTime' => 'Text(100)',  // Last Succefully Submitted Time
        'TimeTaken' => 'Int'                // Total time taken for this training, equals to sum of timeTaken for each correct responses
    );
}

/*
 * only keeps the most-recently answer for a specific user in a specific question in a specific answer/exercise
 */
class UserAnswer extends DataObject {
    private static $db = array(
        'UserID' => 'Int',
        'TrainingType' => 'Text(null)',
        'TrainingID' => 'Int',
        'QuestionID' => 'Int',
        'Answer' => 'Text(null)',
        'IsCorrect' => 'Boolean(0)'
    );
}

/*
 * keep all the correct answers (the user may answer the question for more than one time)
 */
class CorrectResponses extends DataObject {
    private static $db = array (
        'UserID' => 'Int',
        'TrainingType' => 'Text(null)',
        'TrainingID' => 'Int',
        'QuestionID' => 'Int',
        'Answer' => 'Text',
        'TimeTaken' => 'Int',     // Time difference between the current answer and last successful submit
        'TimeSubmitted' => 'Text(100)',
        'Answer'=>'Text(100)'
    );
}

/*
 * keep all the incorrect answers (the user may answer the question for more than one time)
 */
class InCorrectResponses extends DataObject {
    private static $db = array (
        'UserID' => 'Int',
        'TrainingType' => 'Text(null)',
        'TrainingID' => 'Int',
        'QuestionID' => 'Int',
        'Answer' => 'Text',
        'TimeTaken' => 'Int',           // Time Taken for this answer, equals to currTime - lastSubmittedTime
        'TimeSubmitted' => 'Text(100)',
        'Answer'=>'Text(100)'
    );
}

/*
 * Region for all Adventures
 */
class RegionAdventure extends DataObject {

    private static $db = array(
        'QuestionID' => 'Int',
        'Description' => 'Text',
        'Question' => 'Text',
        'Answer' => 'Text',
        'CanSkip' => 'Boolean(0)',
        'HasNoCorrectAnswer' => 'Boolean(0)',
        'IsTextArea' => 'Boolean(0)'
    );

    private static $has_one = array(
        'RegionsPageAdventure' => 'RegionsPageAdventure'
    );

    public function getCMSFields() {
        $fields = FieldList::create(
            TextField::create('QuestionID'),
            TextareaField::create('Description'),
            TextareaField::create('Question'),
            TextField::create('Answer'),
            OptionsetField:: create('CanSkip', 'Can Skip', array(
                "0" => 'Can Not Skip',
                "1" => 'Can Skip',
            )),
            OptionsetField:: create('HasNoCorrectAnswer', 'Has No CorrectAnswer', array(
                "0" => 'Has Correct Answer',
                "1" => 'Has No CorrectAnswer',
            )),
            OptionsetField:: create('IsTextArea', 'Is TextArea', array(
                "0" => 'Is Not Text Area',
                "1" => 'Is Text Area',
            ))
        );
        return $fields;
    }
}

/*
 * Region for all Exercises
 */
class RegionExercise extends DataObject {

    private static $db = array(
        /*
         * Assuming at most 4 options will be given
         */
        'QuestionID' => 'Int',
        'Description' => 'Text',
        'Question' => 'Text',
        'OptionNumber' => 'Int',
        'IsImage' => 'Int',
        'Option1' => 'Text',
        'Option2' => 'Text',
        'Option3' => 'Text',
        'Option4' => 'Text',
        'Answer' => 'Text',
    );

    private static $has_one = array(
        'RegionsPageExercise' => 'RegionsPageExercise'
    );

    public function getCMSFields() {
        $fields = FieldList::create(
            TextField::create('QuestionID'),
            TextareaField::create('Description'),
            TextareaField::create('Question'),
            TextField::create('OptionNumber'),
            OptionsetField:: create('IsImage', 'Is Image', array(
                "0" => 'Not Image',
                "1" => 'Screen Shot',
                "2" => 'Icon',
            )),
            TextareaField::create('Option1'),
            TextareaField::create('Option2'),
            TextareaField::create('Option3'),
            TextareaField::create('Option4'),
            TextField::create('Answer')
        );
        return $fields;
    }
}

class RegionEventCode extends DataObject {

    private static $db = array(
        /*
         * Assuming at most 4 options will be given
         */
        'EventCode' => 'Text',
        'ShowExercise' => 'Boolean(0)',
        'ShowCorrectness' => 'Boolean(0)'
    );

    private static $has_one = array(
        'RegionsPageEventCode' => 'RegionsPageEventCode'
    );

    public function getCMSFields() {
        $fields = FieldList::create(
            TextField::create('EventCode'),
            OptionsetField:: create('ShowExercise', 'Show Exercise', array(
                "0" => 'Hide Exercise',
                "1" => 'Show Exercise'
            )),
            OptionsetField:: create('ShowCorrectness', 'Show Correctness', array(
                "0" => 'Hide Correctness',
                "1" => 'Show Correctness'
            ))
        );
        return $fields;
    }
}