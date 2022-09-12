import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {NzMessageService} from 'ng-zorro-antd/message';
import {IProject} from '@shared/types';
import {ProjectService} from '@services/project.service';
import {PermissionsService} from "@services/permissions.service";
import {generalResourceRNPattern, permissionActions} from "@shared/permissions";
import {ResourceTypeEnum} from "@features/safe/iam/components/policy-editor/types";

@Component({
  selector: 'app-project-drawer',
  templateUrl: './project-drawer.component.html',
  styleUrls: ['./project-drawer.component.less']
})
export class ProjectDrawerComponent implements OnInit {

  private _project: IProject;

  projectForm: FormGroup;

  isEditing: boolean = false;

  isLoading: boolean = false;

  @Input()
  set project(project: IProject) {
    this.isEditing = !!project;
    if (project) {
      this.patchForm(project);
    } else {
      this.resetForm();
    }
    this._project = project;
  }

  get project() {
    return this._project;
  }

  @Input() currentAccountId: number;
  @Input() visible: boolean = false;
  @Output() close: EventEmitter<any> = new EventEmitter();

  permissionDenyMsg = this.permissionsService.genericDenyMessage;

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private message: NzMessageService,
    private permissionsService: PermissionsService
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  initForm() {
    this.projectForm = this.fb.group({
      name: [null, [Validators.required]]
    });
  }

  patchForm(project: Partial<IProject>) {
    this.projectForm.patchValue({
      name: project.name
    });
  }

  resetForm() {
    this.projectForm && this.projectForm.reset();
  }

  onClose() {
    this.close.emit({ isEditing: false, project: undefined });
  }

  canTakeAction() {
    if (!this.isEditing) { // creation
      return this.permissionsService.canTakeAction(generalResourceRNPattern.project, permissionActions.CreateProject);
    } else {
      const rn = this.permissionsService.getResourceRN(ResourceTypeEnum.Project, this.project);
      return this.permissionsService.canTakeAction(rn, permissionActions.UpdateProjectInfo);
    }
  }

  doSubmit() {
    if (!this.canTakeAction()) {
      return this.message.warning(this.permissionsService.genericDenyMessage);
    }

    if (this.projectForm.invalid) {
      for (const i in this.projectForm.controls) {
        this.projectForm.controls[i].markAsDirty();
        this.projectForm.controls[i].updateValueAndValidity();
      }
      return;
    }

    this.isLoading = true;

    const { name } = this.projectForm.value;

    if (this.isEditing) {
      this.projectService
        .putUpdateProject(this.currentAccountId, {name, id: this.project.id})
        .subscribe(
          updatedProject => {
            this.isLoading = false;
            this.close.emit({isEditing: true, project: updatedProject});
            this.message.success('更新成功！');
          },
          _ => {
            this.isLoading = false;
          }
        );
    } else {
      this.projectService
        .postCreateProject(this.currentAccountId, {name})
        .subscribe(
          createdProject => {
            this.isLoading = false;
            this.close.emit({isEditing: false, project: createdProject});
            this.message.success('创建成功！');
          },
          _ => {
            this.isLoading = false;
          }
        );
    }
  }
}