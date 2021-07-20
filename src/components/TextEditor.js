import React from 'react';
import {Editor, EditorState, getDefaultKeyBinding, RichUtils, convertToRaw, convertFromRaw, CompositeDecorator} from 'draft-js';
import {Popover, OverlayTrigger} from 'react-bootstrap';
import '../css/RichEditor.css'
import '../../node_modules/draft-js/dist/Draft.css';
import { Link } from 'react-bootstrap-icons';
import i18n from '../util/i18n';

var DESCRIPTIONRAW;
var STATEHASCHANGED = false;
var STOREDSTATE = {};

class TextEditor extends React.Component {
    constructor(props) {
      super(props);           
      this.state = {  
        editorState : EditorState.createEmpty(this.createDecorator()),
        showURLInput: false,
        urlValue: '',
        showPopoverAddLink: false,
        showPopoverRemoveLink: false,
        popoverMessage: '',
      };
      this.focus = () => this.refs.editor.focus();
      this.onChange = (editorState) => {
        this.setState({editorState});
        DESCRIPTIONRAW = convertToRaw(editorState.getCurrentContent())
        STATEHASCHANGED = true;
      }
      this.handleKeyCommand = this._handleKeyCommand.bind(this);
      this.mapKeyToEditorCommand = this._mapKeyToEditorCommand.bind(this);
      this.toggleBlockType = this._toggleBlockType.bind(this);
      this.toggleInlineStyle = this._toggleInlineStyle.bind(this);
      this.promptForLink = this._promptForLink.bind(this);
      this.onURLChange = (e) => this.setState({urlValue: e.target.value});
      this.confirmLink = this._confirmLink.bind(this);
      this.onLinkInputKeyDown = this._onLinkInputKeyDown.bind(this);
      this.removeLink = this._removeLink.bind(this);
    }

    componentDidMount(){
      if(STOREDSTATE.length){
        this.setState({editorState : EditorState.createWithContent(STOREDSTATE, this.createDecorator())});
      } else {
        this.setState({editorState : EditorState.createEmpty(this.createDecorator())});
      }
    }

    _promptForLink(e) {
      e.preventDefault();
      const {editorState} = this.state;
      const selection = editorState.getSelection();
      if(selection.isCollapsed()){
        this.setState({
          popoverMessage: `${i18n.t('addLink')}`,
          showPopoverAddLink:true
        }, () => {
          setTimeout(() => this.setState({showPopoverAddLink:false}), 2000);
        });
      } else if (!selection.isCollapsed()) {
        const contentState = editorState.getCurrentContent();
        const startKey = editorState.getSelection().getStartKey();
        const startOffset = editorState.getSelection().getStartOffset();
        const blockWithLinkAtBeginning = contentState.getBlockForKey(startKey);
        const linkKey = blockWithLinkAtBeginning.getEntityAt(startOffset);
        let url = '';
        if (linkKey) {
          const linkInstance = contentState.getEntity(linkKey);
          url = linkInstance.getData().url;
        }
        this.setState({
          showURLInput: true,
          urlValue: url,
        }, () => {
          setTimeout(() => this.refs.url.focus(), 0);
        });
      } 
    }

    _confirmLink(e) {
      e.preventDefault();
      const {editorState, urlValue} = this.state;
      const contentState = editorState.getCurrentContent();
      const contentStateWithEntity = contentState.createEntity(
        'LINK',
        'MUTABLE',
        {url: urlValue}
      );
      const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
      const newEditorState = EditorState.set(editorState, { currentContent: contentStateWithEntity });
      this.setState({
        editorState: RichUtils.toggleLink(
          newEditorState,
          newEditorState.getSelection(),
          entityKey
        ),
        showURLInput: false,
        urlValue: '',
      }, () => {
        setTimeout(() => this.refs.editor.focus(), 0);
      });
      STATEHASCHANGED = true;
    }

    _onLinkInputKeyDown(e) {
      if (e.which === 13) {
        this._confirmLink(e);
      }
    }

    _removeLink(e) {
      e.preventDefault();
      const {editorState} = this.state;
      const selection = editorState.getSelection();
      if (!selection.isCollapsed() ) {
        this.setState({
          editorState: RichUtils.toggleLink(editorState, selection, null),
        });
        STATEHASCHANGED = true;
      } else {
        this.setState({
          popoverMessage: `${i18n.t('removeLink')}`,
          showPopoverRemoveLink:true,
        }, () => {
          setTimeout(() => this.setState({showPopoverRemoveLink:false}), 2000);
        });
      }
    }

    _handleKeyCommand(command, editorState) {
      const newState = RichUtils.handleKeyCommand(editorState, command);
      if (newState) {
        this.onChange(newState);
        return true;
      }
      return false;
    }

    _mapKeyToEditorCommand(e) {
      if (e.keyCode === 9 /* TAB */) {
        const newEditorState = RichUtils.onTab(
          e,
          this.state.editorState,
          4, /* maxDepth */
        );
        if (newEditorState !== this.state.editorState) {
          this.onChange(newEditorState);
        }
        return;
      }
      return getDefaultKeyBinding(e);
    }

    _toggleBlockType(blockType) {
      this.onChange(
        RichUtils.toggleBlockType(
          this.state.editorState,
          blockType
        )
      );
    }

    _toggleInlineStyle(inlineStyle) {
      this.onChange(
        RichUtils.toggleInlineStyle(
          this.state.editorState,
          inlineStyle
        )
      );
    }

  createDecorator(){
      const decorator = new CompositeDecorator([
          {
            strategy: this.findLinkEntities,
            component: this.editorLink,
          },
      ]);
      return decorator;
  }

  findLinkEntities(contentBlock, callback, contentState) {
    contentBlock.findEntityRanges(
      (character) => {
        const entityKey = character.getEntity();
        return (
          entityKey !== null &&
          contentState.getEntity(entityKey).getType() === 'LINK'
        );
      },
      callback
    );
  }

  editorLink = (props) => {
    const {url} = props.contentState.getEntity(props.entityKey).getData(); 
    const popover = (
      <Popover id="popover-basic">
        <Popover.Content>
          <a target='_blank' href={url} as='a'>{url}</a>
        </Popover.Content>
      </Popover>);
    return (
      <OverlayTrigger trigger='click' rootClose placement="top" overlay={popover} close='click'>
        <a href={url} >
          {props.children}
        </a>
      </OverlayTrigger>
    );
  };

    render() {
      const {editorState} = this.state;
      // If the user changes block type before entering any text, we can
      // either style the placeholder or hide it. Let's just hide it now.
      let className = 'RichEditor-editor';
      var contentState = editorState.getCurrentContent();
      if (!contentState.hasText()) {
        if (contentState.getBlockMap().first().getType() !== 'unstyled') {
          className += ' RichEditor-hidePlaceholder';
        }
      }
      let urlInput;
      if (this.state.showURLInput) {
        urlInput =
          <div className='urlInputDiv'>
            <input 
              placeholder='full URL please'
              onChange={this.onURLChange}
              ref="url"
              type="text"
              value={this.state.urlValue}
              onKeyDown={this.onLinkInputKeyDown}
            />
            <button onMouseDown={this.confirmLink}>
              Confirm
            </button>
          </div>;
        }

      const popover = (
        <Popover id="popover-basic">
          <Popover.Content>
            {this.state.popoverMessage}
          </Popover.Content>
        </Popover>);
      
      return ( 
        <div className="RichEditor-root">
          <BlockStyleControls
            editorState={editorState}
            onToggle={this.toggleBlockType}
          />
          <InlineStyleControls
            editorState={editorState}
            onToggle={this.toggleInlineStyle}
          />
          <div className='linkControlDiv'>
            <OverlayTrigger show={this.state.showPopoverAddLink} placement="top" overlay={popover}>
              <button
                onClick={ (e) => this.promptForLink(e)}>
                  <Link id='linkUp'/>
              </button>
            </OverlayTrigger>
            <OverlayTrigger show={this.state.showPopoverRemoveLink} placement="top" overlay={popover}>
              <button
                onClick={ (e) => this.removeLink(e)}>
                <Link id='breakLink'/>
              </button>
            </OverlayTrigger>
          </div>
              {urlInput}
          <div className={className} onClick={this.focus}>
            <Editor
              blockStyleFn={getBlockStyle}
              customStyleMap={styleMap}
              editorState={editorState}
              handleKeyCommand={this.handleKeyCommand}
              keyBindingFn={this.mapKeyToEditorCommand}
              onChange={this.onChange}
              placeholder="Tell a story..."
              ref="editor"
              spellCheck={true}
            />           
          </div>
        </div>
      );
    }
  }

  // Custom overrides for "code" style.
  const styleMap = {
    CODE: {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
      fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
      fontSize: 16,
      padding: 2,
    },
  };

  function getBlockStyle(block) {
    switch (block.getType()) {
      case 'blockquote': return 'RichEditor-blockquote';
      default: return null;
    }
  }

  class StyleButton extends React.Component {
    constructor() {
      super();
      this.onToggle = (e) => {
        e.preventDefault();
        this.props.onToggle(this.props.style);
      };
    }

    render() {
      let className = 'RichEditor-styleButton';
      if (this.props.active) {
        className += ' RichEditor-activeButton';
      }

      return (
        <span className={className} onMouseDown={this.onToggle}>
          {this.props.label}
        </span>
      );
    }
  }

  const BLOCK_TYPES = [
    {label: 'H1', style: 'header-one'},
    {label: 'H2', style: 'header-two'},
    {label: 'H3', style: 'header-three'},
    {label: 'UL', style: 'unordered-list-item'},
    {label: 'OL', style: 'ordered-list-item'},
  ];

  const BlockStyleControls = (props) => {
    const {editorState} = props;
    const selection = editorState.getSelection();
    const blockType = editorState
      .getCurrentContent()
      .getBlockForKey(selection.getStartKey())
      .getType();

    return (
      <div className="RichEditor-controls">
        {BLOCK_TYPES.map((type) =>
          <StyleButton
            key={type.label}
            active={type.style === blockType}
            label={type.label}
            onToggle={props.onToggle}
            style={type.style}
          />
        )}
      </div>
    );
  };

  var INLINE_STYLES = [
    {label: 'B', style: 'BOLD', class: 'bold'},
    {label: 'i', style: 'ITALIC', class: 'italic'},
    {label: 'U', style: 'UNDERLINE', class: 'underline'},
  ];

  const InlineStyleControls = (props) => {
    const currentStyle = props.editorState.getCurrentInlineStyle();
    
    return (
      <div className="RichEditor-controls">
        {INLINE_STYLES.map((type) =>
          <div className={type.class}>
          <StyleButton
            key={type.label}
            active={currentStyle.has(type.style)}
            label={type.label}
            onToggle={props.onToggle}
            style={type.style}
          />
          </div>
        )}
      </div>
    );
  };

  function getEditorState(){
    return DESCRIPTIONRAW;
  }

  function setEditorState(storedState, hasContent){
    if(hasContent){
      const contentState = convertFromRaw(storedState);
      STOREDSTATE = contentState;
    } else {
      STOREDSTATE = {};
    }
  }

  function editorStateHasChanged(){
    return STATEHASCHANGED;
  }

  export {getEditorState, setEditorState, editorStateHasChanged};


  export default TextEditor

