import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import addMention from '../addMention';
import KeyDownHandler from '../../../event-handler/keyDown';
import SuggestionHandler from '../../../event-handler/suggestions';
import './styles.css';

class Suggestion {
  constructor(config) {
    const {
      separator,
      trigger,
      getSuggestions,
      onChange,
      onSuggestionDropdownOpen,
      onSuggestionDropdownClose,
      getEditorState,
      getWrapperRef,
      caseSensitive,
      dropdownClassName,
      optionClassName,
      modalHandler,
    } = config;
    this.config = {
      separator,
      trigger,
      getSuggestions,
      onChange,
      onSuggestionDropdownOpen,
      onSuggestionDropdownClose,
      getEditorState,
      getWrapperRef,
      caseSensitive,
      dropdownClassName,
      optionClassName,
      modalHandler,
    };
  }

  findSuggestionEntities = (contentBlock, callback) => {
    if (this.config.getEditorState()) {
      const { separator, trigger, getSuggestions, getEditorState } = this.config;
      const selection = getEditorState().getSelection();
      if (selection.get('anchorKey') === contentBlock.get('key') &&
        selection.get('anchorKey') === selection.get('focusKey')) {
        let text = contentBlock.getText();
        text = text.substr(
          0,
          selection.get('focusOffset') === text.length - 1
            ? text.length
            : selection.get('focusOffset') + 1,
        );
        let index = text.lastIndexOf(separator + trigger);
        let preText = separator + trigger;
        if ((index === undefined || index < 0) && text[0] === trigger) {
          index = 0;
          preText = trigger;
        }
        if (index >= 0) {
          const mentionText = text.substr(index + preText.length, text.length);
          const suggestionPresent =
          getSuggestions().some((suggestion) => {
            if (suggestion.value) {
              if (this.config.caseSensitive) {
                return suggestion.value.indexOf(mentionText) >= 0;
              }
              return suggestion.value.toLowerCase()
                .indexOf(mentionText && mentionText.toLowerCase()) >= 0;
            }
            return false;
          });
          if (suggestionPresent) {
            callback(index === 0 ? 0 : index + 1, text.length);
          }
        }
      }
    }
  }

  getSuggestionComponent = getSuggestionComponent.bind(this);

  getSuggestionDecorator = () => ({
    strategy: this.findSuggestionEntities,
    component: this.getSuggestionComponent(),
  });
}

function getSuggestionComponent() {
  const { config } = this;
  return class SuggestionComponent extends Component {
    static propTypes = {
      children: PropTypes.array,
    };

    constructor(props) {
      super(props);

      this.filterSuggestions(props);
      this.onEditorKeyDown = this.onEditorKeyDown.bind(this);
    }

    state: Object = {
      style: { left: 15 },
      activeOption: -1,
      showSuggestions: true,
    };

    componentDidMount() {
      const { left } = this.suggestion.getBoundingClientRect();

      this.setState({ // eslint-disable-line react/no-did-mount-set-state
        style: { left },
      });
      KeyDownHandler.registerCallBack(this.onEditorKeyDown);
      SuggestionHandler.open();

      if (config.onSuggestionDropdownOpen) {
        config.onSuggestionDropdownOpen();
      }
      config.modalHandler.setSuggestionCallback(this.closeSuggestionDropdown);
    }

    componentWillReceiveProps(props) {
      if (this.props.children !== props.children) {
        this.filterSuggestions(props);
        this.setState({
          showSuggestions: true,
        });
      }
    }

    componentWillUnmount() {
      KeyDownHandler.deregisterCallBack(this.onEditorKeyDown);
      SuggestionHandler.close();

      if (config.onSuggestionDropdownClose) {
        config.onSuggestionDropdownClose();
      }
      config.modalHandler.removeSuggestionCallback();
    }

    onEditorKeyDown = (event) => {
      const { activeOption } = this.state;
      const newState = {};
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (activeOption === this.filteredSuggestions.length - 1) {
          newState.activeOption = 0;
        } else {
          newState.activeOption = activeOption + 1;
        }
        this.suggestion.querySelectorAll('.rdw-suggestion-option')[newState.activeOption].focus();
      } else if (event.key === 'ArrowUp') {
        if (activeOption <= 0) {
          newState.activeOption = this.filteredSuggestions.length - 1;
        } else {
          newState.activeOption = activeOption - 1;
        }
        this.suggestion.querySelectorAll('.rdw-suggestion-option')[newState.activeOption].focus();
      } else if (event.key === 'Escape') {
        newState.showSuggestions = false;
        SuggestionHandler.close();

        if (config.onSuggestionDropdownClose) {
          config.onSuggestionDropdownClose();
        }
      } else if (event.key === 'Enter') {
        this.addMention();
      }
      this.setState(newState);
    }

    onOptionMouseEnter = (event) => {
      const index = event.target.getAttribute('data-index');

      if (index === null) {
        return;
      }

      this.setState({
        activeOption: parseInt(index, 10),
      });
    }

    onOptionMouseLeave = () => {
      this.setState({
        activeOption: -1,
      });
    }

    setSuggestionReference: Function = (ref: Object): void => {
      this.suggestion = ref;
    };

    setDropdownReference: Function = (ref: Object): void => {
      this.dropdown = ref;
    };

    closeSuggestionDropdown: Function = (): void => {
      this.setState({
        showSuggestions: false,
      });
    }

    filteredSuggestions = [];

    filterSuggestions = (props) => {
      const mentionText = props.children[0].props.text.substr(1);
      const suggestions = config.getSuggestions();
      this.filteredSuggestions =
        suggestions && suggestions.filter((suggestion) => {
          if (!mentionText || mentionText.length === 0) {
            return true;
          }
          if (config.caseSensitive) {
            return suggestion.value.indexOf(mentionText) >= 0;
          }
          return suggestion.value.toLowerCase()
            .indexOf(mentionText && mentionText.toLowerCase()) >= 0;
        });
    }

    addMention = () => {
      const { activeOption } = this.state;
      const editorState = config.getEditorState();
      const { onChange, separator, trigger } = config;
      const selectedMention = this.filteredSuggestions[activeOption];
      if (selectedMention) {
        addMention(editorState, onChange, separator, trigger, selectedMention);
      }
    }

    render() {
      const { children } = this.props;
      const { activeOption, showSuggestions } = this.state;
      const { dropdownClassName, optionClassName } = config;
      return (
        <span
          className="rdw-suggestion-wrapper"
          ref={this.setSuggestionReference}
          onClick={config.modalHandler.onSuggestionClick}
          aria-haspopup="true"
          aria-label="rdw-suggestion-popup"
        >
          <span>{children}</span>
          {showSuggestions &&
            <span
              className={classNames('rdw-suggestion-dropdown', dropdownClassName)}
              contentEditable="false"
              suppressContentEditableWarning
              style={this.state.style}
              ref={this.setDropdownReference}
            >
              <span className="rdw-suggestion-dropdown-legend-wrapper">
                <span className="rdw-suggestion-dropdown-legend">
                  <span>Commands matching</span>
                  <span>
                    <span>Use ↑↓ to navigate</span>
                    <span>⮐ to select</span>
                    <span><span className="rdw-suggestion-dropdown-legend-bold">esc</span> to dismiss</span>
                  </span>
                </span>
              </span>
              <span className="rdw-suggestion-dropdown-content">
                {this.filteredSuggestions.map((suggestion, index) =>
                  (<span
                    key={index}
                    spellCheck={false}
                    onClick={this.addMention}
                    data-index={index}
                    tabIndex="-1"
                    onMouseEnter={this.onOptionMouseEnter}
                    onMouseLeave={this.onOptionMouseLeave}
                    className={classNames(
                      'rdw-suggestion-option',
                      optionClassName,
                      { 'rdw-suggestion-option-active': (index === activeOption) },
                    )}
                  >
                    <span className="rdw-suggestion-option-text">{suggestion.text}</span>
                    {suggestion.helptext && <span className="rdw-suggestion-option-helptext">{suggestion.helptext}</span>}
                  </span>))}
              </span>
            </span>}
        </span>
      );
    }
  };
}

module.exports = Suggestion;
