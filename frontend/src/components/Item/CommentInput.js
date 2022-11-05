import React from "react";
import agent from "../../agent";
import { connect } from "react-redux";
import { ADD_COMMENT } from "../../constants/actionTypes";

const mapDispatchToProps = newFunction();

const CommentInput = (props) => {
  const [body, setBody] = React.useState("");
  const handleSubmit = (ev) => {
    ev.preventDefault();
    const payload = agent.Comments.create(props.slug, { body });
    setBody("");
    props.onSubmit(payload);
  };
  return (
    <form className="card comment-form" onSubmit={handleSubmit}>
      <div className="card-block">
        <textarea
          className="form-control"
          placeholder="Write a comment..."
          value={body}
          onChange={(ev) => setBody(ev.target.value)}
          rows="3"
        ></textarea>
      </div>
      <div className="card-footer">
        <img
          src={props.currentUser.image}
          className="comment-author-img"
          alt={props.currentUser.username}
        />
        <button className="btn btn-sm btn-primary" type="submit">
          Post Comment
        </button>
      </div>
    </form>
  );
};

export default connect(() => ({}), mapDispatchToProps)(CommentInput);
function newFunction() {
  return (dispatch) => ({
    onSubmit: (payload) => dispatch({ type: ADD_COMMENT, payload }),
  });
}

