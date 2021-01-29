class DagComment {
    private static _instance: DagComment;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {}

    public setup() {
        const self = this;
        const $dfWrap: JQuery = $("#dagView .dataflowWrap .innerDataflowWrap");
        $dfWrap.on("mousedown", ".comment", function() {
            const $comment = $(this);
            if (!$comment.hasClass("focused")) {
                const $commentArea = $dfWrap.find(".dataflowArea.active .commentArea");
                $commentArea.find(".comment").length;
                if ($comment.index() !== ($commentArea.find(".comment").length - 1)) {
                    // if not the last comment, make it the last comment so it
                    // sits on top of all the other comments
                    $comment.appendTo($commentArea);
                }
            }
        });
        // dblclick will create a new comment wrapper that sits in front of
        // all the nodes and we'll temporarily move the comment to this wrapper
        $dfWrap.on("dblclick", ".commentArea .comment", function() {
            self._focus($(this));
        });

        // blur triggers the removal of the temporary comment wrapper and places
        // the comment back behind the nodes
        $dfWrap.on("blur", ".tempCommentArea .comment textarea", function() {
            const $tempCommentArea = $("#dagView").find(".tempCommentArea");
            const $comment = $tempCommentArea.find(".comment");
            $comment.closest(".dataflowAreaWrapper").find(".commentArea").append($comment);
            $tempCommentArea.remove();
            $comment.removeClass("focused").css("transform", "scale(1)");
            $comment.find("textarea").prop("readonly", true);
        });
        $dfWrap.on("change", ".comment textarea", function() {
            const id = $(this).closest(".comment").data("nodeid");
            const tabId: string = $(this).closest(".dataflowArea").data("id");
            const text = $(this).val();
            self.updateText(id, tabId, text);
        });
    }

    public drawComment(
        commentNode: CommentNode,
        $dfArea: JQuery,
        isSelect?: boolean,
        isFocus?: boolean
    ): void {
        const self = this;
        const pos = commentNode.getPosition();
        const id = commentNode.getId();
        const dim = commentNode.getDimensions();
        let text = commentNode.getText();
        let placeholder = "";
        if (!text) {
            placeholder = "Double-click to edit";
        }
        let $comment = $('<div class="comment" data-nodeid="' + id +
                        '" style="left:' + pos.x + 'px;top:' + pos.y + 'px;' +
                        'width:' + dim.width + 'px;height:' + dim.height +
                        'px;">' +
                            '<textarea spellcheck="false" readonly ' +
                                'placeholder="' + placeholder + '" >' + text +
                            '</textarea>' +
                        '</div>');
        $dfArea.find(".commentArea").append($comment);
        if (isSelect) {
            $comment.addClass("selected");
        }
        if (isFocus) {
            this._focus($comment);
        }
        $comment.resizable({
            "minWidth": DagView.gridSpacing,
            "minHeight": DagView.gridSpacing,
            "grid": DagView.gridSpacing,
            "stop": function(_event, ui) {
                const width = Math.round(ui.size.width / DagView.gridSpacing) * DagView.gridSpacing;
                const height = Math.round(ui.size.height / DagView.gridSpacing) * DagView.gridSpacing;
                $comment.outerWidth(width);
                $comment.outerHeight(height);
                self._updateDimensions(id, {width: width, height: height});
            }
        });
    }

    public removeComment(id) {
        $("#dagView").find('.comment[data-nodeid="' + id + '"]').remove();
    }

    private _updateDimensions(
        id: CommentNodeId,
        size: Dimensions
    ): XDPromise<void> {
        const comment = DagViewManager.Instance.getActiveDag().getComment(id);
        // avoid decimals
        size.width = Math.round(size.width);
        size.height = Math.round(size.height);
        comment.setDimensions(size);
        return DagViewManager.Instance.getActiveTab().save();
    }

    /**
     *
     * @param id
     * @param text
     */
    public updateText(id: CommentNodeId, tabId: string, text: string): XDPromise<void> {
        $("#dagView").find('.comment[data-nodeid="' + id + '"]')
                     .find("textarea").val(text);
        let dagView: DagView = DagViewManager.Instance.getDagViewById(tabId);
        if (!dagView) {
            return;
        }
        const comment: CommentNode = dagView.getGraph().getComment(id);
        const oldText = comment.getText();
        comment.setText(text);
        Log.add(SQLTStr.EditComment, {
            "operation": SQLOps.EditComment,
            "dataflowId": DagViewManager.Instance.getActiveTab().getId(),
            "commentId": id,
            "newComment": text,
            "oldComment": oldText
        });
        return dagView.getTab().save();
    }

    private _focus($comment: JQuery): void {
        const $tempCommentWrapper: JQuery = $(`<div class="tempCommentArea"></div>`);
        $comment.closest(".dataflowAreaWrapper").append($tempCommentWrapper);
        $tempCommentWrapper.attr("style", $comment.closest(".commentArea").attr("style"));
        $tempCommentWrapper.append($comment);
        $comment.addClass("focused");
        $comment.find("textarea").prop("readonly", false).focus();
        const scale = DagViewManager.Instance.getActiveDag().getScale();
        if (scale < 1) {
            // zoom in to the comment area if zoomed out
            $comment.css("transform", "scale(" + (1 / scale) + ")");
        }
    }
}