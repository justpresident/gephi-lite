import { fromPairs, map, omit, pick, toPairs } from "lodash";
import { FC, useContext, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AiOutlinePlusCircle } from "react-icons/ai";
import { BsFillTrashFill } from "react-icons/bs";
import { FaTimes } from "react-icons/fa";
import Select from "react-select";
import { StateManagerProps } from "react-select/dist/declarations/src/useStateManager";
import cx from "classnames";

import { Modal } from "../../../../components/modals";
import { useGraphDataset, useGraphDatasetActions, useSelectionActions } from "../../../../core/context/dataContexts";
import { UIContext } from "../../../../core/context/uiContext";
import { EdgeRenderingData } from "../../../../core/graph/types";
import { ModalProps } from "../../../../core/modals/types";
import { useNotifications } from "../../../../core/notifications";
import { toNumber } from "../../../../core/utils/casting";
// import ColorPicker from "../../../../components/ColorPicker";

interface NodeOption {
  label: string;
  value: string;
}

interface UpdatedEdgeState extends Omit<EdgeRenderingData, "rawWeight"> {
  id: string;
  source: NodeOption;
  target: NodeOption;
  attributes: { key: string; value: string }[];
}

const UpdateEdgeModal: FC<ModalProps<{ edgeId?: string }>> = ({ cancel, submit, arguments: { edgeId } }) => {
  const { t } = useTranslation();
  const { notify } = useNotifications();
  const { portalTarget } = useContext(UIContext);

  const { createEdge, updateEdge } = useGraphDatasetActions();
  const { edgeData, edgeRenderingData, nodeRenderingData, fullGraph } = useGraphDataset();
  const { select } = useSelectionActions();

  const nodeSelectProps: Partial<StateManagerProps> = useMemo(
    () => ({
      classNames: { menuPortal: () => "over-modal" },
      menuPortalTarget: portalTarget,
      placeholder: t("edition.search_nodes") as string,
      options: map(nodeRenderingData, ({ label }, value) => ({ value, label: label || value })),
    }),
    [nodeRenderingData, portalTarget, t],
  );

  const isNew = typeof edgeId === "undefined";
  const defaultValues = useMemo(() => {
    if (isNew)
      return {
        attributes: [],
      };

    const source = fullGraph.source(edgeId);
    const target = fullGraph.target(edgeId);
    return {
      id: edgeId,
      ...omit(edgeRenderingData[edgeId], "rawWeight"),
      source: { value: source, label: nodeRenderingData[source].label || source },
      target: { value: target, label: nodeRenderingData[target].label || target },
      attributes: toPairs(edgeData[edgeId]).map(([key, value]) => ({
        key,
        value: value ? value + "" : undefined,
      })),
    };
  }, [edgeData, edgeId, edgeRenderingData, fullGraph, isNew, nodeRenderingData]);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<UpdatedEdgeState>({
    defaultValues,
  });
  const attributes = watch("attributes");

  return (
    <Modal
      title={(isNew ? t("edition.create_edges") : t("edition.update_edges")) as string}
      onClose={() => cancel()}
      className="modal-lg"
      onSubmit={handleSubmit((data) => {
        const allAttributes = {
          ...fromPairs(
            data.attributes.map(({ key, value }) => {
              // value are all string because input are all text whatever the data model
              // for now we cast value as number if they are number to help downstream algo to create appropriate data model
              const valueAsNumber = toNumber(value);
              return [key, valueAsNumber ? valueAsNumber : value];
            }),
          ),
          ...pick(data, "label", "color", "weight"),
        };

        // Create new edge:
        if (isNew) {
          try {
            createEdge(data.id, allAttributes, data.source.value, data.target.value);
            select({ type: "edges", items: new Set([data.id]), replace: true });
            notify({
              type: "success",
              title: t("edition.create_edges"),
              message: t("edition.create_edges_success"),
            });
            submit({});
          } catch (e) {
            notify({
              type: "error",
              title: t("edition.create_edges"),
              message: (e as Error).message || t("error.unknown"),
            });
          }
        }
        // Update existing edge:
        else {
          try {
            updateEdge(data.id, allAttributes);
            select({ type: "edges", items: new Set([data.id]), replace: true });
            notify({
              type: "success",
              title: t("edition.update_edges"),
              message: t("edition.update_edges_success"),
            });
            submit({});
          } catch (e) {
            notify({
              type: "error",
              title: t("edition.update_edges"),
              message: (e as Error).message || t("error.unknown"),
            });
          }
        }
      })}
    >
      <div className="row g-3">
        <div className="col-md-6">
          <label htmlFor="updateEdge-id" className="form-label">
            {t("graph.model.edges-data.id")}
          </label>
          <input
            type="text"
            id="updateEdge-id"
            className={cx("form-control", errors.id && "is-invalid")}
            disabled={!isNew}
            {...register("id", { required: "true", validate: (value) => !!value && (!isNew || !edgeData[value]) })}
          />
          {errors.id && (
            <div className="invalid-feedback">
              {t(`error.form.${errors.id.type === "validate" ? "unique" : errors.id.type}`)}
            </div>
          )}
        </div>
        <div className="col-md-6">
          <label htmlFor="updateEdge-label" className="form-label">
            {t("graph.model.edges-data.label")}
          </label>
          <div className="d-flex flex-row">
            <input type="text" id="updateEdge-label" className="form-control" {...register("label")} />
            <button
              type="button"
              className="btn btn-sm btn-outline-dark flex-shrink-0 ms-2"
              onClick={() => setValue("label", undefined)}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Extremities */}
        <div className="col-md-6">
          <label htmlFor="updateEdge-source" className="form-label">
            {t("graph.model.edges-data.source")}
          </label>
          <Controller
            control={control}
            name="source"
            rules={{
              required: true,
              validate: ({ value }) => !!nodeRenderingData[value],
            }}
            render={({ field: { onChange, ...field } }) => (
              <Select
                {...field}
                {...nodeSelectProps}
                className={cx(errors.source && "form-control react-select is-invalid")}
                isDisabled={!isNew}
                onChange={(newValue) => onChange(newValue as NodeOption)}
                id="updateEdge-source"
              />
            )}
          />
          {errors.source && <div className="invalid-feedback">{t(`error.form.${errors.source.type}`)}</div>}
        </div>
        <div className="col-md-6">
          <label htmlFor="updateEdge-target" className="form-label">
            {t("graph.model.edges-data.target")}
          </label>
          <Controller
            control={control}
            name="target"
            rules={{
              required: true,
              validate: ({ value }) => !!nodeRenderingData[value],
            }}
            render={({ field: { onChange, ...field } }) => (
              <Select
                {...field}
                {...nodeSelectProps}
                className={cx(errors.target && "form-control react-select is-invalid")}
                isDisabled={!isNew}
                onChange={(newValue) => onChange(newValue as NodeOption)}
                id="updateEdge-target"
              />
            )}
          />
          {errors.target && <div className="invalid-feedback">{t(`error.form.${errors.target.type}`)}</div>}
        </div>

        {/* Rendering attributes */}
        <div className="col-md-6 d-flex flex-row align-items-center">
          <label htmlFor="updateEdge-weight" className="form-label mb-0 flex-shrink-0">
            {t("graph.model.edges-data.weight")}
          </label>
          <input
            type="number"
            id="updateEdge-weight"
            className="form-control flex-grow-1 ms-2"
            min={0}
            step="any"
            {...register("weight", { min: 0 })}
          />
          <button
            type="button"
            className="btn btn-sm btn-outline-dark flex-shrink-0 ms-2"
            onClick={() => setValue("weight", undefined)}
          >
            <FaTimes />
          </button>
        </div>

        {/* Other attributes */}
        <div>{t("graph.model.edges-data.attributes")}</div>
        {attributes.map((_, i) => (
          <div key={i} className="col-12 d-flex flex-row">
            <div className="flex-grow-1 me-2">
              <input
                type="text"
                className="form-control"
                placeholder={t("graph.model.edges-data.attribute-name") as string}
                {...register(`attributes.${i}.key`, {
                  required: "true",
                  validate: (value, formValues) => !formValues.attributes.some((v, j) => j !== i && value === v.key),
                })}
              />
              {(errors.attributes || [])[i]?.key && (
                <div className="invalid-feedback">
                  {t(
                    `error.form.${
                      (errors.attributes || [])[i]?.key?.type === "validate"
                        ? "unique"
                        : (errors.attributes || [])[i]?.key?.type
                    }`,
                  )}
                </div>
              )}
            </div>
            <div className="flex-grow-1 me-2">
              <input
                type="text"
                className="form-control"
                placeholder={t("graph.model.edges-data.attribute-value") as string}
                {...register(`attributes.${i}.value`)}
              />
              {(errors.attributes || [])[i]?.value && (
                <div className="invalid-feedback">{t(`error.form.${(errors.attributes || [])[i]?.value?.type}`)}</div>
              )}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-dark flex-shrink-0"
              onClick={() =>
                setValue(
                  "attributes",
                  getValues("attributes").filter((_, j) => j !== i),
                )
              }
            >
              <BsFillTrashFill />
            </button>
          </div>
        ))}
        <div className="col-12">
          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={() => setValue("attributes", getValues("attributes").concat({ key: "", value: "" }))}
          >
            <AiOutlinePlusCircle className="me-2" /> {t("graph.model.edges-data.new-attribute")}
          </button>
        </div>
      </div>

      <>
        <button type="button" className="btn btn-outline-dark" onClick={() => cancel()}>
          {t("common.cancel")}
        </button>
        <button type="submit" className="btn btn-primary">
          {isNew ? t("edition.create_edges") : t("edition.update_edges")}
        </button>
      </>
    </Modal>
  );
};

export default UpdateEdgeModal;
