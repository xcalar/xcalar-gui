<?php
class HomePage extends Page {
}

class HomePage_Controller extends Page_Controller {

    private static $allowed_actions = array('Form','getUserId', 'submit','getCurrentUser', 'setMultipleChoice');

    public function Form() {
        // Create fields
        $fields = new FieldList(
            new TextField('Name'),
            new EmailField('Email'),
            new TextField('EventCode')
        );

        // Create actions
        $actions = new FieldList(
            new FormAction('submit', 'Submit')
        );

        $validator = new RequiredFields('Name', 'Email', 'EventCode');

        //Creating a Form object and returning it
        return new Form($this, 'Form', $fields, $actions, $validator);
    }

    public function submit($data, $form) {
        date_default_timezone_set('America/Los_Angeles');
        $users = LoginSubmission::get()->filter(array(
            'Name' => $data['Name'],
            'Email' => $data['Email']
        ));
        if ($users->exists()) {
            $user = $users[0];
            $user->EventCode = $data['EventCode'];
            $user->write();
            $_SESSION["currentUserID"] = $user->ID;
            $_SESSION["loginTime"] = date("Y-m-d H:i:s", time());
            $_SESSION["lastSubmitTime"] = $_SESSION["loginTime"];
        } else {
            $user = new LoginSubmission();
            $form->saveInto($user);
            $userID = $user->write();
            $_SESSION["currentUserID"] = $userID;
            $_SESSION["loginTime"] = date("Y-m-d H:i:s", time());
            $_SESSION["lastSubmitTime"] = $_SESSION["loginTime"];
        }
        $this->redirect("xcalar-adventure/");
    }
}