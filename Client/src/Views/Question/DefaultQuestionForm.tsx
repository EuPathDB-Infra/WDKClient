import * as React from 'react';

import { HelpIcon, IconAlt } from 'wdk-client/Components';
import { DispatchAction } from 'wdk-client/Core/CommonTypes';
import { makeClassNameHelper, safeHtml } from 'wdk-client/Utils/ComponentUtils';
import { Seq } from 'wdk-client/Utils/IterableUtils';
import { Parameter, ParameterGroup } from 'wdk-client/Utils/WdkModel';
import { QuestionState } from 'wdk-client/StoreModules/QuestionStoreModule';
import {
  changeGroupVisibility,
  updateParamValue,
  submitQuestion,
  updateCustomQuestionName,
  updateQuestionWeight
} from 'wdk-client/Actions/QuestionActions';
import 'wdk-client/Views/Question/DefaultQuestionForm.scss';
import { CompoundsByFoldChange } from 'wdk-client/Views/Question/Groups/FoldChange/foldChangeGroup';

type EventHandlers = {
  setGroupVisibility: typeof changeGroupVisibility,
  updateParamValue: typeof updateParamValue
}

type Props = {
  state: QuestionState;
  dispatchAction: DispatchAction;
  eventHandlers: EventHandlers;
  parameterElements: Record<string, React.ReactNode>;
}

const cx = makeClassNameHelper('wdk-QuestionForm');
const tooltipPosition = { my: 'right center', at: 'left center' };

export default class DefaultQuestionForm extends React.Component<Props> {

  handleSubmit = (e: React.FormEvent) => {
    const { dispatchAction, state: { question } } = this.props;
    e.preventDefault();
    dispatchAction(submitQuestion({ searchName: question.urlSegment }));
  }

  handleCustomNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { dispatchAction, state: { question } } = this.props;
    dispatchAction(updateCustomQuestionName({ searchName: question.urlSegment, customName: event.target.value }));
  }

  handleWeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { dispatchAction, state: { question } } = this.props;
    dispatchAction(updateQuestionWeight({ searchName: question.urlSegment, weight: event.target.value }));
  }

  render() {
    const { state, eventHandlers, parameterElements } = this.props
    const { customName, groupUIState, question, weight } = state;
    return (
      <div className={cx()}>
        <h1>{question.displayName}</h1>
        <form onSubmit={this.handleSubmit}>
          {question.groups
            .filter(group => group.displayType !== 'hidden')
            .map(group =>
              group.displayType === 'dynamic' && state.question.urlSegment === 'CompoundsByFoldChange'
                ? (
                  <CompoundsByFoldChange {...this.props} />
                )
                : (
                <Group
                  key={group.name}
                  searchName={question.urlSegment}
                  group={group}
                  uiState={groupUIState[group.name]}
                  onVisibilityChange={eventHandlers.setGroupVisibility}
                >
                  <ParameterList
                    parameterMap={question.parametersByName}
                    parameterElements={parameterElements}
                    parameters={group.parameters}
                  />
                </Group>
              )
            )
          }
          <div className={cx('SubmitSection')}>
            <button type="submit" className="btn">
              Get Answer
            </button>
            <div>
              <HelpIcon tooltipPosition={tooltipPosition}>Give this search strategy a custom name. The name will appear in the first step box (truncated to 15 characters).</HelpIcon>
              <input
                type="text"
                placeholder="Give this search a name (optional)"
                value={customName}
                onChange={this.handleCustomNameChange}
              />
            </div>
            <div>
              <HelpIcon tooltipPosition={tooltipPosition}>Give this search a weight (for example 10, 200, -50, integer only). It will show in a column in your result. In a search strategy, unions and intersects will sum the weights, giving higher scores to items found in multiple searches. Default weight is 10.</HelpIcon>
              <input
                type="text"
                pattern="[+-]?\d*"
                placeholder="Give this search a weight (optional)"
                value={weight}
                onChange={this.handleWeightChange}
              />
            </div>
          </div>
          {question.description && (
            <div>
              <hr/>
              <h2>Description</h2>
              {safeHtml(question.description)}
            </div>
          )}
        </form>
      </div>
    )
  }
}

type GroupProps = {
  searchName: string;
  group: ParameterGroup;
  uiState: any;
  onVisibilityChange: EventHandlers['setGroupVisibility'];
  children: React.ReactChild;
}

function Group(props: GroupProps) {
  switch(props.group.displayType) {
    case 'ShowHide':
      return <ShowHideGroup {...props}/>

    default:
      return <div>{props.children}</div>;
  }
}

function ShowHideGroup(props: GroupProps) {
  const { searchName, group, uiState: { isVisible }, onVisibilityChange } = props;
  return (
    <div className={cx('ShowHideGroup')} >
      <button
        type="button"
        className={cx('ShowHideGroupToggle')}
        onClick={() => {
          onVisibilityChange({
            searchName,
            groupName: group.name,
            isVisible: !isVisible
          })
        }}
      >
        <IconAlt fa={`caret-${isVisible ? 'down' : 'right'}`}/> {group.displayName}
      </button>
      <div className={cx('ShowHideGroupContent')} >
        {isVisible ? props.children : null}
      </div>
    </div>
  )
}


type ParameterListProps = {
  parameters: string[];
  parameterMap: Record<string, Parameter>;
  parameterElements: Record<string, React.ReactNode>;
}
function ParameterList(props: ParameterListProps) {
  const { parameters, parameterMap, parameterElements } = props;
  return (
    <div className={cx('ParameterList')}>
      {Seq.from(parameters)
        .map(paramName => parameterMap[paramName])
        .map(parameter => (
          <React.Fragment key={parameter.name}>
            <ParameterHeading parameter={parameter}/>
            <div className={cx('ParameterControl')}>
              {parameterElements[parameter.name]}
            </div>
          </React.Fragment>
        ))}
    </div>
  )
}

function ParameterHeading(props: { parameter: Parameter}) {
  const { parameter } = props;
  return (
    <div className={cx('ParameterHeading')} >
      <h2>
        <HelpIcon>{parameter.help}</HelpIcon> {parameter.displayName}
      </h2>
    </div>
  )
}

